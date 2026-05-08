# SmartOrder — Order Guide Import Flow

## Purpose

Defines the complete user flow and technical pipeline for importing a paper or PDF order guide into the SmartOrder catalog. This is the primary data entry path for building the inventory catalog from real-world vendor order guides.

---

## Flow Overview

```
Entry points:
  - Dashboard → "Import Order Guide"
  - Catalog page → "Import Guide" button
  - Empty catalog state → import CTA

Step 1: File Selection
  └─ Select file (camera, photo library, or file picker)
  └─ Validate: type (PDF/image), size (≤ 10MB)
  └─ Show preview + "Start Import" button

Step 2: Upload & Queue
  └─ Compress image (if image, not PDF)
  └─ Upload to Vercel Blob
  └─ Create ocrJob record → status: "queued"
  └─ Show: "Uploading... [progress bar]"

Step 3: Processing (async)
  └─ Textract job starts → status: "textract_processing"
  └─ UI shows: "Reading document..."
  └─ Poll job status every 3 seconds

Step 4: AI Parsing
  └─ Textract complete → OpenAI parse → status: "parsing"
  └─ UI shows: "Finding inventory items..."

Step 5: Review
  └─ status: "review_pending"
  └─ Show results: N items found
  └─ High-confidence items: bulk accept available
  └─ Low-confidence items: one-by-one review

Step 6: Confirm
  └─ User accepts items (individually or in bulk)
  └─ Accepted items inserted into catalogItems
  └─ status: "complete"
  └─ Navigate to catalog with new items highlighted
```

---

## UX at Each Step

### Step 1: File Selection

```
┌─────────────────────────────────┐
│ Import Order Guide              │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │  📷    │  │  📄    │       │
│  │ Camera │  │  File   │       │
│  └─────────┘  └─────────┘      │
│  ┌─────────────────────────┐   │
│  │  📱 Photo Library      │   │
│  └─────────────────────────┘   │
│                                 │
│  Supported: PDF, JPG, PNG       │
│  Max size: 10MB                 │
└─────────────────────────────────┘
```

### Step 3-4: Processing

```
┌─────────────────────────────────┐
│ Processing Order Guide          │
│                                 │
│  ████████████░░░░░░  60%        │
│                                 │
│  Reading document...            │  ← updates as status changes
│                                 │
│  ┌─────────────────────────┐   │
│  │ [preview of document]   │   │
│  └─────────────────────────┘   │
│                                 │
│  This usually takes 20–60s      │  ← set expectations
└─────────────────────────────────┘
```

Progress steps map to job status:
- "queued" → 10%
- "textract_processing" → 30%
- "parsing" → 70%
- "review_pending" → 100% → show results

### Step 5: Review

```
┌─────────────────────────────────┐
│ 47 items found                  │
│                                 │
│ ✓ 32 ready to add               │  ← high confidence (≥ 0.90)
│ ⚠ 15 need review                │  ← low confidence (< 0.90)
│                                 │
│ [Review 15 items →]             │  ← primary action
│ [Accept all 32 ready items]     │  ← secondary (skip review)
│                                 │
│ [View 47 items before accepting]│  ← tertiary
└─────────────────────────────────┘
```

### Item review card

```
┌─────────────────────────────────┐
│ ⚠ Needs review                  │
│                                 │
│ Name ─────────────────────────  │
│ [Whole Milk 1 Gallon        ] ✎ │
│                                 │
│ Vendor ────────────────────────  │
│ [Dean's                     ] ✎ │
│                                 │
│ Pack size ─────────────────────  │
│ [4/1GAL                     ] ✎ │
│                                 │
│ Unit type ─────────────────────  │
│ [case ▼]                        │
│                                 │
│ ▶ OCR source (tap to view)      │  ← collapsible
│                                 │
│ [✓ Accept]  [✎ Edit]  [✕ Skip] │
└─────────────────────────────────┘
```

---

## Duplicate Detection

Before adding accepted items to the catalog:

```typescript
// For each accepted item, check for potential duplicates
for (const item of acceptedItems) {
  const match = await matchOCRItemToCatalog(item, existingCatalog);

  if (!match.isNew && match.confidence >= 0.90) {
    // Potential duplicate — show merge dialog
    showMergePrompt(item, match.match!);
  } else {
    // New item — add to catalog
    createCatalogItem(item);
  }
}
```

### Merge prompt

```
┌─────────────────────────────────┐
│ Similar item already exists     │
│                                 │
│ NEW (from import):              │
│ Whole Milk 1 Gallon — Dean's    │
│                                 │
│ EXISTING in catalog:            │
│ Whole Milk 1 Gal — Deans        │
│                                 │
│ [Keep as new item]              │
│ [Use existing]                  │
│ [Merge (update existing)]       │
└─────────────────────────────────┘
```

---

## Error States and Recovery

| State | UI message | Recovery option |
|---|---|---|
| Upload failed | "Upload failed — check connection" | Retry upload |
| Textract failed | "Could not read document — try re-scanning" | Retry or manual entry |
| Parse failed | "Could not find items — document may be unclear" | Use raw text view + manual entry |
| Zero items found | "No items detected in this document" | Manual entry |

---

## Implementation Notes

### File input component

```tsx
// src/components/backroom/file-import.tsx
"use client";

export function OrderGuideImport() {
  const [jobId, setJobId] = useState<string | null>(null);
  const uploadMutation = api.ocr.startImportJob.useMutation({
    onSuccess: (job) => setJobId(job.id),
  });

  async function handleFileSelect(file: File) {
    // Client-side validation
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB)");
      return;
    }

    // Compress if image
    const processedFile = file.type.startsWith("image/")
      ? await compressSnapshot(file)
      : file;

    // Upload
    uploadMutation.mutate({
      fileName: file.name,
      fileType: file.type,
      fileData: await fileToBase64(processedFile),
    });
  }

  if (jobId) return <OCRJobStatus jobId={jobId} />;

  return <FileSelector onSelect={handleFileSelect} />;
}
```

---

## Constraints

1. Import flow is async — never block the UI while Textract processes
2. Low-confidence items can never be auto-added (always require explicit acceptance)
3. Duplicate detection runs for all accepted items before catalog insertion
4. The raw OCR text is preserved until the job is marked complete
5. Users can import multiple guides — each creates a separate job

---

## Rules

1. Progress bar reflects actual job status transitions
2. "Accept all ready items" accepts only items with confidence ≥ 0.90
3. Skipped items are not added to the catalog (they disappear from the review)
4. The import flow is cancellable at any step without corrupting the catalog
5. After completion, the user is shown the new items in the catalog with a "new" badge

---

## AI-Agent Instructions

When implementing the import flow:
1. The file validation (size + MIME type) runs both client-side and server-side
2. The progress bar maps to job status values — connect it to the polling hook
3. Low-confidence items require individual review — no bulk-accept for items < 0.90
4. Duplicate detection is required before catalog insertion
5. The `compressSnapshot` utility handles image compression client-side

---

## Production Considerations

- Textract async jobs can take up to 2 minutes for large PDFs — UI must reflect this
- If the user closes the browser during processing, the job continues; show status on return
- Implement a "pending imports" indicator on the catalog page for in-progress jobs
- Cost control: limit to 2 concurrent active OCR jobs per user account
