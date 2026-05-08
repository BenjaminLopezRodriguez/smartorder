# SmartOrder — OCR Pipeline

## Purpose

Defines the complete pipeline for importing paper and PDF order guides into structured inventory catalog data. This pipeline is the primary data ingestion path for SmartOrder. It combines AWS Textract for text extraction with OpenAI structured outputs for semantic parsing.

---

## Responsibilities

- Define the end-to-end flow from file upload to catalog import
- Specify the async job architecture for Textract processing
- Define validation, confidence scoring, and human review requirements
- Establish error handling and retry behavior for each pipeline stage

---

## Pipeline Overview

```
User selects PDF/photo
        ↓
Client: upload file (progress shown immediately)
        ↓
tRPC: backroom.uploadOrderGuide
  └─ Validate file (type, size)
  └─ Upload to Vercel Blob → get URL
  └─ Insert ocrJob record (status: "queued")
  └─ Return { jobId, status }
        ↓
Background: triggerTextract(jobId, blobUrl)
  └─ Textract: StartDocumentTextDetection (async)
  └─ Update ocrJob (status: "textract_processing", textractJobId)
        ↓
Textract webhook or polling
  └─ Textract job complete → fetch raw text blocks
  └─ Store raw text in ocrJob.rawTextOutput
  └─ Update ocrJob (status: "parsing")
        ↓
AI parsing: parseOrderGuide(jobId)
  └─ OpenAI structured output → ParsedCatalogItem[]
  └─ Store parsed items in ocrJob.parsedItems (JSON)
  └─ Update ocrJob (status: "review_pending")
        ↓
Client: user reviews parsed items
  └─ High confidence (≥0.90): auto-listed for bulk accept
  └─ Low confidence (<0.75): shown individually for review
  └─ User accepts / edits / rejects each item
        ↓
tRPC: catalog.confirmOCRItems
  └─ Insert confirmed items into catalogItems table
  └─ Update ocrJob (status: "complete")
```

---

## Database Schema Requirements

Add to `src/server/db/schema.ts`:

```typescript
export const ocrJobs = createTable(
  "ocr_job",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    status: d
      .varchar({ length: 32 })
      .notNull()
      .default("queued"),
      // values: "queued" | "uploading" | "textract_processing" | "parsing" | "review_pending" | "complete" | "failed"
    sourceFileName: d.varchar({ length: 256 }),
    sourceBlobUrl: d.text().notNull(),
    textractJobId: d.varchar({ length: 256 }),
    rawTextOutput: d.text(),
    parsedItemsJson: d.text(), // JSON string of ParsedCatalogItem[]
    errorMessage: d.text(),
    pageCount: d.integer(),
    itemsFound: d.integer(),
    itemsConfirmed: d.integer(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("ocr_job_status_idx").on(t.status),
    index("ocr_job_created_at_idx").on(t.createdAt),
  ],
);
```

Also extend `catalogItems` with provenance fields:
```typescript
// Additional fields on catalogItems
aiGenerated: d.boolean().default(false),
aiConfidence: d.real(),
ocrJobId: d.uuid().references(() => ocrJobs.id, { onDelete: "set null" }),
ocrSource: d.text(), // verbatim OCR text this item came from
```

---

## File Upload Rules

| Attribute | Limit | Reason |
|---|---|---|
| Accepted types | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` | Textract support |
| Max file size | 10 MB per file | Textract limit; also cost control |
| Max PDF pages | 15 pages per job | Textract async job limits + cost |
| Concurrent jobs per user | 2 | Prevent cost abuse |

```typescript
// File validation (server-side, in tRPC procedure)
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

if (file.size > MAX_SIZE_BYTES) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "File too large (max 10MB)" });
}
if (!ALLOWED_TYPES.includes(file.type)) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported file type" });
}
```

---

## AWS Textract Integration

### Which API to use

| Document type | Textract API | Reason |
|---|---|---|
| Scanned image (photo) | `DetectDocumentText` (sync) | < 5 pages, fast |
| Multi-page PDF | `StartDocumentTextDetection` (async) | Required for PDFs |
| Table-heavy order guides | `StartDocumentAnalysis` (async) | Better table extraction |

Use `StartDocumentAnalysis` for all order guides — it captures table structure which dramatically improves item parsing accuracy.

### Textract response handling

```typescript
// Extract text blocks from Textract response
function extractTextFromBlocks(blocks: TextBlock[]): string {
  return blocks
    .filter(b => b.BlockType === "LINE" && b.Confidence && b.Confidence > 60)
    .map(b => b.Text ?? "")
    .join("\n");
}

// For table-aware parsing
function extractTablesFromBlocks(blocks: TextBlock[]): TextTable[] {
  // Group CELL blocks by TABLE block → reconstruct row/column structure
}
```

---

## Polling Architecture

Since Textract jobs are async (5–120 seconds), the client polls for status:

```typescript
// Client-side polling hook
export function useOCRJobStatus(jobId: string | null) {
  return api.ocr.getJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: !!jobId,
      refetchInterval: (data) => {
        if (!data) return 3000;
        if (data.status === "review_pending" || data.status === "complete" || data.status === "failed") {
          return false; // stop polling
        }
        return 3000; // poll every 3 seconds
      },
      staleTime: 0,
    }
  );
}
```

---

## Error States

| Error | Recovery behavior |
|---|---|
| Upload failed | Retry button; log error |
| Textract job failed | Retry job; fall back to manual entry if repeated failure |
| OpenAI parse failed | Show raw OCR text for manual entry; log error |
| Zero items parsed | Show raw OCR text; suggest manual entry |
| File too degraded | Show image with "poor quality" warning; suggest re-scan |

---

## Review UI Requirements

### Bulk review flow

```
┌─────────────────────────────────────────────┐
│  Import Results: 47 items found             │
│  ✓ 32 high-confidence (ready to add)        │
│  ⚠ 15 need review                           │
│                                             │
│  [Review 15 items]  [Accept 32 & Skip]      │
└─────────────────────────────────────────────┘
```

### Item review card

```
┌─────────────────────────────────────────────┐
│ REVIEW NEEDED                               │  ← amber badge
│                                             │
│ Name:      [Whole Milk 1 Gallon    ] ✎     │
│ Vendor:    [Dean's                 ] ✎     │
│ Pack size: [4/1GAL                 ] ✎     │
│ Unit:      [case ▼]                         │
│                                             │
│ OCR source: "WHL MLK 1G DEANS 4/CS $18.50" │  ← collapsible
│                                             │
│ [Accept]  [Edit & Accept]  [Reject]         │
└─────────────────────────────────────────────┘
```

---

## Constraints

1. Never write AI-parsed items to `catalogItems` without user confirmation
2. Raw OCR text must be preserved until the job is marked complete (for re-parsing)
3. A single file upload may produce 0 to ~200 items — UI must handle this range
4. PDF processing must be asynchronous — never block an HTTP request on Textract
5. All parsed items include their `ocrSource` text before being presented for review

---

## Anti-patterns

- Calling Textract synchronously from a tRPC procedure that the user is waiting on
- Auto-importing all high-confidence items without showing the user any result
- Losing the raw OCR text after parsing (needed for user review and debugging)
- Parsing without a retry mechanism on OpenAI rate limit errors
- Creating catalog items with `null` names (validate before insertion)

---

## Rules

1. OCR job status transitions: `queued → uploading → textract_processing → parsing → review_pending → complete`
2. The `failed` status is terminal — show error + manual entry option
3. Token usage is logged for every AI parse call
4. Textract costs are estimated and shown to admin before bulk imports
5. The review step is mandatory — no `--force-import` shortcut

---

## AI-Agent Instructions

When implementing the OCR pipeline:
1. The `ocrJobs` table schema above is canonical — extend it, don't replace it
2. Use `StartDocumentAnalysis` (not `DetectDocumentText`) for order guides — table structure is critical
3. The review UI must show `ocrSource` text for every item with confidence < 0.90
4. Polling interval: 3 seconds while job is active, `false` when terminal
5. All Textract SDK calls must be wrapped in the `callWithRetry` utility

---

## Production Considerations

- Textract pricing: ~$0.015 per page (text) or $0.065 per page (table analysis)
- OpenAI pricing: ~$0.005 per 1000 tokens for gpt-4o (order guides typically 500–3000 tokens)
- Cost per average order guide import (15 pages): ~$1.00–$1.50
- Implement per-user monthly import quota in production
- Store Textract job IDs — they expire, but are useful for debugging within 24 hours
- Vercel Blob storage: implement retention policy for OCR source files (keep 90 days)
