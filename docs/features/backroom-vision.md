# SmartOrder — BackroomVision System

## Purpose

Defines the BackroomVision feature: shared backroom inventory snapshots with visual segmentation, estimated item counts, and received-date extraction. BackroomVision creates a persistent visual memory of the backroom state, enabling teams to see at a glance what's on the floor without a full scan session.

---

## Responsibilities

- Define the capture, storage, and analysis pipeline for backroom snapshots
- Specify the Segment Anything Model (SAM) integration for visual segmentation
- Define the data model for snapshots and their annotations
- Establish the UI patterns for capture, review, and browsing

---

## What BackroomVision Is

BackroomVision is a **visual inventory snapshot system**. A worker takes a photo of a shelf, pallet, or backroom area. The system:

1. Stores the image with location metadata
2. Optionally runs visual segmentation (SAM) to identify item groups
3. Estimates visible item counts per group
4. Displays snapshots in a shared feed, ordered by recency and location
5. Allows team members to see the current backroom state without being physically present

BackroomVision is NOT:
- A real-time inventory system (snapshots are point-in-time)
- A barcode scanning system (it cannot read barcodes from photos reliably)
- A replacement for the scan session workflow

---

## Data Model

```typescript
// src/server/db/schema.ts additions

export const backroomSnapshots = createTable(
  "backroom_snapshot",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    location: d.varchar({ length: 256 }).notNull(), // "Dairy cooler", "Dry goods aisle 3"
    imageUrl: d.text().notNull(),              // Vercel Blob URL
    thumbnailUrl: d.text(),                    // Compressed thumbnail for list views
    capturedBy: d.varchar({ length: 256 }),    // User display name (no auth foreign key yet)
    notes: d.text(),                           // Optional worker notes
    segmentationStatus: d
      .varchar({ length: 32 })
      .default("none"),
      // values: "none" | "processing" | "complete" | "failed"
    segmentationJson: d.text(),                // SAM output: segments with bounding boxes
    estimatedItemCount: d.integer(),           // Derived from segmentation
    itemGroupsJson: d.text(),                  // BackroomVisionSchema output from GPT-4o vision
    receivedDate: d.date(),                    // Extracted from labels if visible
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("backroom_snapshot_location_idx").on(t.location),
    index("backroom_snapshot_created_at_idx").on(t.createdAt),
  ],
);
```

---

## Capture Flow

```
Worker opens BackroomVision → "Capture" button
        ↓
Camera opens (rear-facing, full resolution)
Worker frames the shelf/area
Worker taps capture (or uses volume button as shutter)
        ↓
Client-side:
  - Compress image to ≤ 1MB (canvas resize to max 1920px wide)
  - Show preview with "Add location" and "Add note" prompts
  - Location field: free text OR select from previous locations
        ↓
tRPC: backroom.createSnapshot
  - Upload compressed image to Vercel Blob
  - Insert snapshot record (status: "processing" if segmentation enabled)
  - Return { snapshotId }
        ↓
Background: if segmentation enabled
  - Run GPT-4o vision analysis → item groups + count estimates
  - Update snapshot with analysis results
        ↓
Client: navigate to snapshot detail or back to feed
```

---

## Image Compression Pipeline

All images are compressed client-side before upload. This:
- Reduces upload time (critical on warehouse Wi-Fi)
- Reduces Blob storage costs
- Keeps AI vision analysis costs reasonable

```typescript
// src/lib/image/compress.ts
export async function compressSnapshot(
  file: File,
  maxWidthPx = 1920,
  qualityPercent = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidthPx / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/jpeg",
        qualityPercent,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
```

---

## Visual Analysis (GPT-4o Vision)

BackroomVision uses GPT-4o's vision capability to analyze images and produce structured item count estimates. See `docs/ai/prompt-templates.md` → Template 3 for the full prompt and schema.

### When to run analysis

- Optional (user can enable/disable per organization)
- Always async — never block the capture flow
- Shows "Analyzing..." state on the snapshot card until complete

### SAM Integration (advanced tier)

Segment Anything Model provides more accurate per-item segmentation by generating instance masks:

```
Image → SAM API → instance masks (bounding boxes + polygons)
                       ↓
         Group masks by similarity (size, color clustering)
                       ↓
         Per-group count estimate
                       ↓
         Overlay on image for display
```

**Implementation status**: SAM integration is a planned enhancement. Initial version uses GPT-4o vision only.

**SAM endpoint**: Hosted separately (Python FastAPI on Vercel or Railway). Not part of the Next.js app.

---

## Location System

Locations are free-text strings with autocomplete from previous values. No fixed taxonomy — different facilities use different naming conventions.

```typescript
// tRPC procedure to get location suggestions
getLocationSuggestions: protectedProcedure
  .input(z.object({ query: z.string().min(1) }))
  .query(async ({ ctx, input }) => {
    return ctx.db
      .selectDistinct({ location: backroomSnapshots.location })
      .from(backroomSnapshots)
      .where(ilike(backroomSnapshots.location, `%${input.query}%`))
      .limit(10);
  }),
```

---

## Snapshots Feed UI

The snapshots feed shows recent snapshots grouped by location:

```
┌─────────────────────────────────────────────┐
│ BACKROOM VISION                             │
│                                             │
│ [Capture]  [Filter: All locations ▼]        │
│                                             │
│ ── Dairy Cooler                             │
│ ┌───────────┐  ┌───────────┐               │
│ │           │  │           │               │
│ │ [photo]   │  │ [photo]   │               │
│ │           │  │           │               │
│ │ ~24 items │  │ ~18 items │               │
│ │ 2h ago    │  │ Yesterday │               │
│ └───────────┘  └───────────┘               │
│                                             │
│ ── Dry Goods Aisle 3                        │
│ ┌───────────┐                              │
│ │ [photo]   │                              │
│ │ ~42 cases │                              │
│ │ 4h ago    │                              │
│ └───────────┘                              │
└─────────────────────────────────────────────┘
```

---

## Snapshot Detail View

```
┌─────────────────────────────────────────────┐
│ ← Dairy Cooler                              │
│ Captured 2 hours ago by Marcus              │
│                                             │
│ [Full image, scrollable, zoomable]          │
│                                             │
│ Item Groups (from vision analysis):         │
│ • Whole milk (1gal)  ~12 cases             │
│ • 2% milk (1gal)     ~8 cases              │
│ • OJ (64oz)          ~6 units              │
│                                             │
│ Notes: "Dairy wall looks full - delivery   │
│ didn't come yet"                            │
│                                             │
│ [Delete]  [Share]                           │
└─────────────────────────────────────────────┘
```

---

## Constraints

1. Snapshots are informational — they never modify the catalog or a scan session
2. Analysis results are estimates — always show count ranges, never exact counts
3. Images must be compressed client-side before upload
4. Camera access follows the same permission pattern as scan detection
5. Snapshots do not expire automatically — implement retention UI in settings

---

## Anti-patterns

- Using BackroomVision counts to pre-fill scan session quantities
- Treating AI item count estimates as inventory facts
- Storing full-resolution images in Blob (compress to ≤ 1MB)
- Blocking the capture flow on segmentation processing
- Running SAM synchronously from the tRPC mutation

---

## Rules

1. Every snapshot must have a `location` before saving
2. Analysis runs asynchronously — the capture flow completes in < 3 seconds
3. Item count displays always show a range (e.g., "~18–22 cases"), not a precise number
4. Workers can add or edit notes on any snapshot
5. Delete is permanent — no soft delete needed (snapshots are ephemeral memory)

---

## AI-Agent Instructions

When implementing BackroomVision:
1. Image compression runs client-side — use the `compressSnapshot` utility, never upload raw images
2. Analysis is optional and async — don't gate the capture flow on its completion
3. The `segmentationJson` field stores raw SAM output; `itemGroupsJson` stores parsed GPT-4o results
4. Location autocomplete uses `ilike` search on previous snapshot locations — no taxonomy table needed
5. Show "Analyzing..." skeleton state on snapshot cards while `segmentationStatus === "processing"`

---

## Production Considerations

- GPT-4o vision cost: ~$0.003–$0.015 per image (depending on resolution passed to API)
- Compress images to ≤ 1MP before sending to GPT-4o vision to minimize cost
- Vercel Blob storage: $0.023/GB/month — budget ~5MB per snapshot (compressed) = ~4000 snapshots per $1/month
- Implement a "delete old snapshots" retention setting (default: keep 30 days)
- SAM integration requires a separate Python service — document its endpoint in environment variables
