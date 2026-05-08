# SmartOrder — File Upload Pipeline

## Purpose

Defines the complete file upload pipeline for SmartOrder, covering both order guide imports and backroom snapshots. The upload pipeline handles client-side validation, compression, progress feedback, and server-side storage to Vercel Blob.

---

## Responsibilities

- Define the upload flow for each file type
- Specify client-side and server-side validation
- Establish progress feedback requirements
- Define error handling and retry behavior

---

## File Types

| Type | Source | Destination | Processing |
|---|---|---|---|
| Order guide (PDF/image) | Camera or file picker | Vercel Blob | Textract OCR + AI parsing |
| Backroom snapshot | Camera | Vercel Blob | Optional AI vision analysis |

---

## Upload Pipeline

```
User selects file / takes photo
        ↓
Client: validate (type, size)
        ↓
Client: compress (images only, to ≤ 1MB)
        ↓
Client: show upload progress (0–100%)
        ↓
Server (tRPC): receive and validate again
        ↓
Server: upload to Vercel Blob
        ↓
Server: create DB record (with blobUrl)
        ↓
Server: return { id, blobUrl }
        ↓
Client: trigger downstream processing
  (Textract job for order guides, or vision analysis for snapshots)
```

---

## Client-Side Validation

```typescript
// src/lib/upload/validate.ts
const ALLOWED_TYPES = {
  orderGuide: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  snapshot: ["image/jpeg", "image/png", "image/webp"],
} as const;

const MAX_SIZE = {
  orderGuide: 10 * 1024 * 1024, // 10MB
  snapshot: 20 * 1024 * 1024,   // 20MB (pre-compression)
} as const;

export type UploadContext = keyof typeof ALLOWED_TYPES;

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: "type_not_allowed" | "too_large" | "empty_file" };

export function validateFile(file: File, context: UploadContext): ValidationResult {
  if (file.size === 0) return { valid: false, error: "empty_file" };
  if (file.size > MAX_SIZE[context]) return { valid: false, error: "too_large" };
  if (!(ALLOWED_TYPES[context] as readonly string[]).includes(file.type)) {
    return { valid: false, error: "type_not_allowed" };
  }
  return { valid: true };
}
```

---

## Client-Side Image Compression

Applied to all image uploads (not PDFs):

```typescript
// src/lib/upload/compress.ts
export async function compressImage(
  file: File,
  opts: {
    maxWidthPx?: number;
    maxSizeBytes?: number;
    quality?: number;
  } = {},
): Promise<Blob> {
  const {
    maxWidthPx = 1920,
    maxSizeBytes = 1 * 1024 * 1024, // 1MB default
    quality = 0.82,
  } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const scale = Math.min(1, maxWidthPx / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context unavailable")); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Try to get under maxSizeBytes with quality reduction
      let q = quality;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Compression failed")); return; }
            if (blob.size <= maxSizeBytes || q < 0.50) {
              resolve(blob);
            } else {
              q -= 0.10;
              tryCompress();
            }
          },
          "image/jpeg",
          q,
        );
      };
      tryCompress();
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}
```

---

## Upload Hook

```typescript
// src/hooks/use-file-upload.ts
"use client";

type UploadState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "compressing"; progress: number }
  | { status: "uploading"; progress: number }
  | { status: "success"; id: string; blobUrl: string }
  | { status: "error"; message: string };

export function useFileUpload(context: UploadContext) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const uploadMutation = api.files.upload.useMutation();

  async function upload(file: File): Promise<{ id: string; blobUrl: string } | null> {
    setState({ status: "validating" });

    const validation = validateFile(file, context);
    if (!validation.valid) {
      const messages = {
        type_not_allowed: "File type not supported",
        too_large: "File is too large",
        empty_file: "File is empty",
      };
      setState({ status: "error", message: messages[validation.error] });
      return null;
    }

    let processedFile: File | Blob = file;

    if (file.type.startsWith("image/")) {
      setState({ status: "compressing", progress: 0 });
      try {
        processedFile = await compressImage(file, { maxSizeBytes: 1 * 1024 * 1024 });
      } catch {
        setState({ status: "error", message: "Failed to process image" });
        return null;
      }
    }

    setState({ status: "uploading", progress: 0 });

    try {
      const result = await uploadMutation.mutateAsync({
        context,
        fileName: file.name,
        fileType: file.type,
        fileData: await blobToBase64(processedFile),
      });
      setState({ status: "success", id: result.id, blobUrl: result.blobUrl });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setState({ status: "error", message });
      return null;
    }
  }

  function reset() { setState({ status: "idle" }); }

  return { state, upload, reset };
}
```

---

## Progress Feedback UI

```tsx
// Upload progress display
function UploadProgress({ state }: { state: UploadState }) {
  if (state.status === "idle") return null;

  return (
    <div className="space-y-2 p-3 border rounded-md">
      {state.status === "validating" && <p className="text-sm">Checking file...</p>}
      {state.status === "compressing" && (
        <div>
          <p className="text-sm">Preparing image...</p>
          <Progress value={state.progress} className="h-1 mt-1" />
        </div>
      )}
      {state.status === "uploading" && (
        <div>
          <p className="text-sm">Uploading...</p>
          <Progress value={state.progress} className="h-1 mt-1" />
        </div>
      )}
      {state.status === "success" && (
        <p className="text-sm text-green-600">Upload complete</p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
    </div>
  );
}
```

---

## Server-Side Upload (tRPC)

```typescript
// src/server/api/routers/files.ts
export const filesRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(z.object({
      context: z.enum(["orderGuide", "snapshot"]),
      fileName: z.string().max(256),
      fileType: z.string().max(64),
      fileData: z.string(), // base64
    }))
    .mutation(async ({ ctx, input }) => {
      // Server-side validation (re-validate, never trust client)
      const buffer = Buffer.from(input.fileData, "base64");
      const sizeLimit = input.context === "orderGuide" ? 10 * 1024 * 1024 : 1 * 1024 * 1024;

      if (buffer.byteLength > sizeLimit) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File too large" });
      }

      // Upload to Vercel Blob
      const { put } = await import("@vercel/blob");
      const blob = await put(`${input.context}/${Date.now()}-${input.fileName}`, buffer, {
        access: "public",
        contentType: input.fileType,
      });

      return { id: blob.url.split("/").pop()!, blobUrl: blob.url };
    }),
});
```

---

## Constraints

1. Client-side validation is UX; server-side validation is security — always do both
2. Images are always compressed to ≤ 1MB before server upload
3. PDFs are uploaded as-is (compression would corrupt them)
4. Never store base64 data in the database — only Blob URLs
5. File uploads are always to Vercel Blob, never to PostgreSQL

---

## Anti-patterns

- Trusting client-supplied file types (check magic bytes or re-validate server-side)
- Uploading raw full-resolution images without compression
- Storing upload data in Zustand (it's transient — use hook state)
- No progress feedback (upload feels frozen to the user)

---

## AI-Agent Instructions

When implementing file upload:
1. Always validate both client-side AND server-side — the client-side is for UX, not security
2. Use the `compressImage` utility for all image uploads (not PDFs)
3. Store only the Blob URL in the database, not the file data
4. The upload hook returns `null` on failure — check the return value before proceeding

---

## Production Considerations

- Vercel Blob bandwidth: $0.10/GB — monitor usage; compress aggressively
- Vercel Blob storage: $0.023/GB/month — implement retention policies
- Base64 transmission overhead: ~33% larger than binary; consider multipart upload for large files
- For very large PDFs (> 5MB), consider presigned URL upload directly to Blob from client
