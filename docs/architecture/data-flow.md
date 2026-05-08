# SmartOrder — Data Flow

## Purpose

Documents the data flow for each major operation in SmartOrder. This is the reference for understanding how data moves through the system — from user action to database state and back to the UI.

---

## Data Flow 1: Order Guide Import

```
1. User selects PDF/image on device
   └─ Client: validateFile() → compressImage() (if image)

2. Client: tRPC mutation → files.upload
   └─ Server: re-validate → upload to Vercel Blob → return blobUrl

3. Client: tRPC mutation → ocr.startJob
   └─ Server: insert ocrJob (status: "queued") → return { jobId }
   └─ Server: async → trigger Textract job
   └─ Server: update ocrJob (status: "textract_processing", textractJobId)

4. Client: poll api.ocr.getJobStatus every 3s
   └─ Server: check ocrJob.status from DB

5. Textract completes → Server: fetch raw text blocks
   └─ Store rawTextOutput on ocrJob
   └─ Trigger AI parse: structuredCompletion(rawText) → ParsedItem[]
   └─ Store parsedItemsJson on ocrJob
   └─ Update ocrJob (status: "review_pending")

6. Client: poll detects "review_pending"
   └─ Fetch parsed items: api.ocr.getParsedItems({ jobId })
   └─ Render review UI (grouped by confidence)

7. User accepts/edits/rejects items
   └─ Client: tRPC mutation → catalog.confirmOCRItems({ jobId, accepted })
   └─ Server: insert confirmed items into catalogItems (with ocrSource, aiConfidence)
   └─ Update ocrJob (status: "complete")
   └─ Return: { added: number, skipped: number }

8. Client: navigate to catalog with new items highlighted
   └─ Invalidate api.catalog.list query
```

---

## Data Flow 2: Scan Session

```
1. User opens list → taps "Start Scan Session"
   └─ Zustand: startSession(listId)
   └─ Client: prefetch api.lists.getWithItems({ listId })

2. Scan session renders:
   └─ Items from tRPC query (server state)
   └─ Current counts from Zustand scan store (local state)
   └─ currentItemIndex from Zustand

3. User increments count (tap +, or scan detection fires)
   └─ Zustand: incrementCount(listItemId)
   └─ UI updates immediately (no server round-trip)
   └─ listItemId added to pendingSyncIds

4. Debounced sync (2s after last change):
   └─ Client: tRPC mutation → lists.batchUpdateScannedCounts
   └─ Server: UPDATE list_items SET scanned_cases = N WHERE id = ?
   └─ On success: Zustand: markSynced(syncedIds)

5. User taps "Mark Scanned"
   └─ Zustand: advanceItem()
   └─ currentItemIndex++
   └─ If lastItem: transition to REVIEW state

6. REVIEW state:
   └─ Display all items with counts from Zustand
   └─ User can edit any count (Zustand: setCount())
   └─ User taps "Complete & Export"

7. Completion:
   └─ Await final sync (non-debounced) for any pending counts
   └─ tRPC mutation → lists.complete({ listId })
   └─ Server: UPDATE lists SET status = 'complete'
   └─ Zustand: resetSession()
   └─ Navigate to export screen

8. Export:
   └─ Client: tRPC query → lists.getExportData({ listId })
   └─ Render printable/shareable output
   └─ Navigator.share() or download as CSV
```

---

## Data Flow 3: Catalog Search

```
1. User types in search input
   └─ Debounce: 150ms

2. After debounce:
   └─ Client: api.catalog.search.useQuery({ query, limit: 20 })
   └─ OR (if client-side Fuse.js): immediate local search

3. Server (if server-side):
   └─ normalizeQuery(input)
   └─ Drizzle + pg_trgm: SELECT ... WHERE name % $query ORDER BY similarity DESC LIMIT 20

4. Results returned:
   └─ Render item list
   └─ If 0 results: show "Add [query] as new item" CTA

5. User taps item → "Add to List" action:
   └─ tRPC mutation → lists.addItem({ listId, catalogItemId })
   └─ Server: INSERT INTO list_items (listId, catalogItemId, ...) RETURNING *
   └─ Client: Invalidate api.lists.getWithItems({ listId })
   └─ Optimistic update: show item in list immediately
```

---

## Data Flow 4: BackroomVision Capture

```
1. User opens camera → captures photo
   └─ Client: processSnapshot(file) → displayBlob + thumbnail + visionBlob

2. User enters location (required) + optional notes
   └─ Client: tRPC mutation → backroom.createSnapshot
   └─ Server:
       a. Upload displayBlob → Vercel Blob → displayUrl
       b. Upload thumbnail → Vercel Blob → thumbnailUrl
       c. INSERT INTO backroom_snapshots (location, imageUrl, thumbnailUrl, ...)
       d. Return { id, imageUrl, thumbnailUrl }

3. Background (if vision analysis enabled):
   └─ Server: analyzeBackroomSnapshot(visionBlob)
   └─ GPT-4o vision → BackroomVisionResult
   └─ UPDATE backroom_snapshots SET itemGroupsJson = ?, segmentationStatus = 'complete'

4. Client:
   └─ Navigate to snapshot detail (or back to feed)
   └─ Snapshot feed shows new card with thumbnail
   └─ If analysis in progress: "Analyzing..." skeleton
   └─ Poll until segmentationStatus != 'processing'
```

---

## Data Flow 5: Voice Item Add (List Building)

```
1. User taps microphone → Web Speech API starts
   └─ SpeechRecognition.start()
   └─ UI: "Listening..."

2. User speaks product name
   └─ SpeechRecognition.onresult: interimTranscript updated in real-time
   └─ On isFinal: finalTranscript captured

3. Client: normalizeQuery(finalTranscript)
   └─ fuseSearch(normalized, cachedCatalog)
   └─ If confidence ≥ 0.75: show matched item card
   └─ If confidence < 0.75: show alternatives or pre-fill search

4. User taps [Add to List]:
   └─ Same as catalog search item add (Flow 3, step 5)
```

---

## State Ownership Summary

| Data | Owner | Persistence |
|---|---|---|
| Catalog items | PostgreSQL + React Query | Permanent DB + client cache |
| Lists and list items | PostgreSQL + React Query | Permanent DB + client cache |
| Active scan session | Zustand (persisted) | localStorage |
| Scan counts (in progress) | Zustand (persisted) | localStorage → synced to DB |
| BackroomVision snapshots | PostgreSQL + React Query | Permanent DB |
| OCR job state | PostgreSQL + React Query | Permanent DB + client cache |
| Search results | React Query (transient) | Client cache (staleTime 0) |
| UI state (modals, sidebar) | Zustand | Not persisted |

---

## Cache Invalidation Rules

| Mutation | Invalidates |
|---|---|
| `catalog.create` | `catalog.list`, `catalog.search` |
| `catalog.update` | `catalog.list`, `catalog.getById` |
| `catalog.delete` | `catalog.list` |
| `lists.create` | `lists.list` |
| `lists.addItem` | `lists.getWithItems` |
| `lists.batchUpdateScannedCounts` | `lists.getWithItems` (but defer — optimistic) |
| `lists.complete` | `lists.list`, `lists.getById` |
| `backroom.createSnapshot` | `backroom.list` |
| `catalog.confirmOCRItems` | `catalog.list`, `catalog.search` |

---

## AI-Agent Instructions

When implementing any new data operation:
1. Identify which flow above it most closely matches
2. Determine whether data belongs in Zustand (ephemeral/in-progress) or PostgreSQL (permanent)
3. Define cache invalidation: which queries become stale after each mutation?
4. For async operations (OCR, vision): follow the status polling pattern
5. Document the new flow here if it doesn't match an existing pattern

---

## Production Considerations

- Scan count debounce (2s) assumes network reliability; increase to 5s if connectivity is poor
- OCR polling interval (3s) is reasonable for Textract's typical 10–60s processing time
- React Query cache TTLs must be intentionally set — check `docs/frontend/state-management.md`
- Large backroom snapshot feeds should be paginated (limit 20 per page) to avoid over-fetching
