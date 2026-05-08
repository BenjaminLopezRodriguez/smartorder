# SmartOrder — Image Processing Pipeline

## Purpose

Defines how images are processed in SmartOrder — from capture to analysis. Images appear in two contexts: order guide imports (documents for OCR) and backroom snapshots (photos for visual inventory). Each context has different processing requirements.

---

## Responsibilities

- Define the image processing pipeline for each context
- Specify compression, format, and quality standards
- Define the computer vision pipeline for BackroomVision
- Establish performance and cost constraints

---

## Image Contexts

| Context | Source | Processing | Storage |
|---|---|---|---|
| Order guide | Camera or file picker | Compress → Textract OCR | Vercel Blob (raw + OCR result) |
| Backroom snapshot | Camera | Compress → GPT-4o vision → SAM (future) | Vercel Blob (compressed) |

---

## Compression Standards

| Context | Max width | Max size | Format | Quality |
|---|---|---|---|---|
| Order guide (image) | 2400px | 3MB | JPEG | 0.90 (high — OCR needs detail) |
| Backroom snapshot | 1920px | 1MB | JPEG | 0.82 (balance quality/cost) |
| Snapshot thumbnail | 400px | 50KB | JPEG | 0.70 |
| AI vision input | 1024px | 500KB | JPEG | 0.80 (vision models don't need full res) |

Higher quality for order guides because OCR accuracy depends on text sharpness. Lower quality for snapshots because AI vision analysis is robust to compression.

---

## Client-Side Processing Pipeline

```
User selects/captures image
         ↓
Validate: MIME type, file size (raw)
         ↓
Decode: FileReader → HTMLImageElement
         ↓
Resize: canvas.drawImage() → scale to maxWidth
         ↓
Compress: canvas.toBlob() → JPEG at quality
         ↓
Thumbnail: same pipeline, 400px, 0.70 quality
         ↓
Upload: both files to Vercel Blob
```

---

## Order Guide Image Processing

Order guides are document images. OCR accuracy is paramount.

```typescript
// src/lib/image/process-order-guide.ts
export async function processOrderGuide(file: File): Promise<{
  processedBlob: Blob;
  thumbnail: Blob;
}> {
  // For PDFs: pass through directly (no image processing)
  if (file.type === "application/pdf") {
    const thumbnail = await generatePDFThumbnail(file);
    return { processedBlob: file, thumbnail };
  }

  // For images: high-quality compression (OCR needs detail)
  const processedBlob = await compressImage(file, {
    maxWidthPx: 2400,
    maxSizeBytes: 3 * 1024 * 1024,
    quality: 0.90,
  });

  const thumbnail = await compressImage(file, {
    maxWidthPx: 400,
    maxSizeBytes: 50 * 1024,
    quality: 0.70,
  });

  return { processedBlob, thumbnail };
}
```

---

## Backroom Snapshot Processing

Backroom snapshots optimize for storage cost and AI vision performance:

```typescript
// src/lib/image/process-snapshot.ts
export async function processSnapshot(file: File): Promise<{
  displayBlob: Blob;   // 1920px, for display in the app
  thumbnail: Blob;     // 400px, for list views
  visionBlob: Blob;    // 1024px, for AI vision analysis
}> {
  const [displayBlob, thumbnail, visionBlob] = await Promise.all([
    compressImage(file, { maxWidthPx: 1920, maxSizeBytes: 1 * 1024 * 1024, quality: 0.82 }),
    compressImage(file, { maxWidthPx: 400, maxSizeBytes: 50 * 1024, quality: 0.70 }),
    compressImage(file, { maxWidthPx: 1024, maxSizeBytes: 500 * 1024, quality: 0.80 }),
  ]);

  return { displayBlob, thumbnail, visionBlob };
}
```

---

## EXIF Orientation Handling

Mobile camera images often have EXIF orientation metadata. The canvas doesn't read EXIF — images may appear rotated.

```typescript
import Exifr from "exifr"; // lightweight EXIF parser

async function correctOrientation(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  orientation: number,
) {
  if (orientation <= 1 || orientation > 8) return; // no rotation needed

  // Swap canvas dimensions for 90/270 rotations
  if ([5, 6, 7, 8].includes(orientation)) {
    [canvas.width, canvas.height] = [canvas.height, canvas.width];
  }

  ctx.save();
  // Apply rotation transform based on EXIF orientation
  const transforms: Record<number, () => void> = {
    2: () => { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); },
    3: () => { ctx.translate(canvas.width, canvas.height); ctx.rotate(Math.PI); },
    4: () => { ctx.translate(0, canvas.height); ctx.scale(1, -1); },
    5: () => { ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); },
    6: () => { ctx.rotate(0.5 * Math.PI); ctx.translate(0, -canvas.height); },
    7: () => { ctx.rotate(0.5 * Math.PI); ctx.translate(canvas.width, -canvas.height); ctx.scale(-1, 1); },
    8: () => { ctx.rotate(-0.5 * Math.PI); ctx.translate(-canvas.width, 0); },
  };

  transforms[orientation]?.();
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
```

---

## AI Vision Input Preparation

For GPT-4o vision analysis, images must be:
- Resized to ≤ 1024px (API automatically downscales, but we control cost)
- Encoded as base64 for the API call

```typescript
// src/lib/ai/analyze-snapshot.ts
import { structuredCompletion } from "./openai-client";
import { BackroomVisionSchema } from "./schemas";
import { BACKROOM_VISION_SYSTEM_PROMPT } from "./prompt-templates";

export async function analyzeBackroomSnapshot(
  imageBlob: Blob,
): Promise<BackroomVisionResult | null> {
  const base64 = await blobToBase64(imageBlob);
  const mimeType = "image/jpeg";

  try {
    const result = await structuredCompletion({
      model: "gpt-4o-2024-08-06",
      systemPrompt: BACKROOM_VISION_SYSTEM_PROMPT,
      userPrompt: "Analyze this backroom image and identify all visible product groups.",
      // Note: vision input is handled differently from text input
      schema: BackroomVisionSchema,
      schemaName: "backroom_vision",
    });

    return result.data;
  } catch (err) {
    logger.error("ai.vision.failed", { error: err instanceof Error ? err.message : String(err) });
    return null; // Vision analysis is optional — never fail the snapshot save
  }
}

// Note: for vision, use the messages format with image content
// The structuredCompletion wrapper needs to support image messages
```

---

## Segment Anything Model (SAM) — Future

SAM provides instance-level segmentation masks on backroom images.

**Current status**: Planned. Not in initial implementation.

**Planned architecture**:
```
Compressed snapshot (1024px)
        ↓
SAM API endpoint (Python service, Railway or Vercel)
  └─ Input: image URL
  └─ Output: instance masks (bounding boxes + polygons)
        ↓
Store segmentation JSON on backroomSnapshot record
        ↓
Client: render mask overlays on image
```

**Data format**:
```typescript
type SAMSegment = {
  id: number;
  boundingBox: [x: number, y: number, w: number, h: number]; // relative 0-1
  polygon: Array<[number, number]>;  // relative 0-1 coordinates
  confidence: number;
  area: number;  // fraction of image area
};
```

---

## Constraints

1. All client-side image processing uses Canvas API (no server-side image libraries)
2. EXIF orientation must be corrected before upload (warehouse cameras have varied orientations)
3. PDFs are never reprocessed as images — pass through to Textract directly
4. Vision analysis is optional — a snapshot is fully functional without it
5. All image processing is async — never block the upload flow

---

## Anti-patterns

- Uploading raw full-resolution camera images (8–12MB) without compression
- Skipping EXIF orientation correction (rotated images fail OCR)
- Blocking the upload UI while compressing (show progress immediately)
- Storing image data as base64 in the database

---

## Rules

1. Images are always compressed before upload — no raw camera images in storage
2. Thumbnails are generated for all images (needed for efficient list views)
3. Vision analysis never blocks snapshot saving
4. EXIF orientation is read and corrected before canvas processing

---

## AI-Agent Instructions

When implementing image processing:
1. Use the `compressImage` utility in `src/lib/image/compress.ts` — do not write custom canvas code
2. Always generate a thumbnail alongside the display image
3. Vision analysis failures must not prevent snapshot creation (return `null`, log error)
4. EXIF orientation correction must be applied to all mobile camera uploads

---

## Production Considerations

- Canvas compression is CPU-intensive on low-end phones — test on iPhone 8/X (older hardware)
- Large PDF previews are not needed — generate a thumbnail from the first page using PDF.js (future)
- Monitor Blob storage growth; compressed snapshots at 1MB/each × 50/day = 1.5GB/month
- GPT-4o vision pricing: ~$0.003–$0.015 per image — compress to ≤ 500KB before API call
