# SmartOrder — Engineering Anti-Patterns

## Purpose

This document catalogs the specific patterns that must never appear in SmartOrder code. Anti-patterns are recorded here because they have historically caused (or would cause) architectural drift, data integrity issues, performance problems, or UX failures in this exact type of operational software.

---

## Responsibilities

- Warn AI agents about prohibited patterns before they generate code
- Give engineers a reference during code review
- Explain *why* each pattern is forbidden, not just *that* it is
- Prevent recurring mistakes from repeating across the codebase

---

## Category 1: Architecture Anti-patterns

### AP-ARCH-01: Direct database access from components
```typescript
// FORBIDDEN
import { db } from "@/server/db";
export async function CatalogList() {
  const items = await db.select().from(catalogItems); // ← NO
}

// Correct
import { api } from "@/trpc/server";
export async function CatalogList() {
  const items = await api.catalog.list();
}
```
**Why**: Bypasses tRPC's input validation, auth context, and caching layer. Creates untraceable data access patterns.

---

### AP-ARCH-02: Mixing server and client data-fetching patterns
```typescript
// FORBIDDEN: fetching in a Client Component via fetch()
"use client";
useEffect(() => {
  fetch("/api/catalog").then(...); // ← NO
}, []);

// Correct: use tRPC query hook
const { data } = api.catalog.list.useQuery({ limit: 50 });
```
**Why**: Creates a parallel API surface that bypasses validation, auth, and type safety.

---

### AP-ARCH-03: Business logic in page files
```typescript
// FORBIDDEN
// src/app/(app)/lists/[listId]/page.tsx
export default async function Page({ params }) {
  const items = await db.select().from(listItems); // ← NO
  const filtered = items.filter(i => i.scannedCases < i.targetCases); // ← NO
  const total = filtered.reduce((acc, i) => acc + i.targetCases, 0); // ← NO
}

// Correct: pages are thin — pass data to feature components
export default async function Page({ params }) {
  return <ListDetail listId={params.listId} />;
}
```

---

### AP-ARCH-04: God routers (unrelated procedures grouped together)
```typescript
// FORBIDDEN
// src/server/api/routers/app.ts — everything in one file
export const appRouter = createTRPCRouter({
  createList: ...,
  searchCatalog: ...,
  uploadSnapshot: ...,
  parseOCR: ...,    // ← 4 different domains in one router
});

// Correct: one router per domain
// routers/lists.ts, routers/catalog.ts, routers/backroom.ts, routers/ocr.ts
```

---

### AP-ARCH-05: Storing server data in Zustand
```typescript
// FORBIDDEN
const useCatalogStore = create(() => ({
  items: [],  // ← server data does not belong in Zustand
  loadItems: async () => {
    const items = await fetch("/api/catalog").then(r => r.json());
    set({ items }); // ← NO
  }
}));

// Correct: React Query (via tRPC) owns server state
const { data: items } = api.catalog.list.useQuery({ limit: 50 });
```
**Why**: Creates two sources of truth. Cache invalidation becomes impossible. Data goes stale silently.

---

## Category 2: Data Integrity Anti-patterns

### AP-DATA-01: Writing AI data to the database without validation
```typescript
// FORBIDDEN
const aiResponse = await openai.chat.completions.create(...);
await db.insert(catalogItems).values(aiResponse.choices[0].message.content); // ← NO

// Correct
const parsed = CatalogItemListSchema.safeParse(JSON.parse(aiResponse.choices[0].message.content));
if (!parsed.success) { /* handle error */ }
const validatedItems = parsed.data.items;
// Then: present for user review, THEN write to DB
```

---

### AP-DATA-02: Auto-applying AI inventory quantities
```typescript
// FORBIDDEN: filling scannedCases from AI prediction
await db.update(listItems).set({
  scannedCases: aiPredictedQuantity, // ← NEVER auto-fill quantities
});

// Correct: quantities only come from explicit user input or scan events
```
**Why**: Wrong quantity = wrong order = real operational consequence. AI must never assert quantities.

---

### AP-DATA-03: Hallucinated barcodes and codes
```typescript
// FORBIDDEN in AI prompt output
{
  "barcode": "012345678901",  // ← if not present in OCR source, return null
}

// Correct structured output rule: if not in source text, return null — never fabricate
```

---

### AP-DATA-04: Cascading deletes on catalog items
```typescript
// FORBIDDEN in schema
catalogItemId: d.uuid().references(() => catalogItems.id, { onDelete: "cascade" }), // ← NO for list items

// Correct: restrict, not cascade — prevent accidental data loss
catalogItemId: d.uuid().references(() => catalogItems.id, { onDelete: "restrict" }),
```
**Why**: A catalog item deletion should never silently wipe historical list data.

---

## Category 3: Performance Anti-patterns

### AP-PERF-01: N+1 queries in tRPC procedures
```typescript
// FORBIDDEN
const lists = await db.select().from(listsTable);
const result = await Promise.all(
  lists.map(list =>
    db.select().from(listItems).where(eq(listItems.listId, list.id)) // ← N queries
  )
);

// Correct: join or batch query
const result = await db
  .select({ list: listsTable, item: listItems })
  .from(listsTable)
  .leftJoin(listItems, eq(listItems.listId, listsTable.id));
```

---

### AP-PERF-02: Unindexed foreign key columns
```typescript
// FORBIDDEN: missing index on foreign key
export const listItems = createTable("list_item", (d) => ({
  listId: d.uuid().references(() => lists.id),
  // No index ← will cause full table scans
}));

// Correct: always index foreign keys
(t) => [index("list_item_list_idx").on(t.listId)]
```

---

### AP-PERF-03: Blocking OCR calls
```typescript
// FORBIDDEN: waiting synchronously for Textract (takes 5–60 seconds)
const textractResult = await textract.analyzeDocument(...).promise(); // ← blocks request

// Correct: start async job, return job ID, poll from client
const job = await textract.startDocumentTextDetection(...).promise();
await db.insert(ocrJobs).values({ jobId: job.JobId, status: "processing" });
return { jobId: job.JobId }; // client polls status
```

---

### AP-PERF-04: Unnecessary re-renders during scan session
```typescript
// FORBIDDEN: putting the entire scan store in component state
const [scanState, setScanState] = useState({ items: largeArray, counts: {} });
// Modifying counts re-renders ALL items ← kills scan performance

// Correct: use Zustand with selector to isolate renders
const count = useScanStore(s => s.scannedCounts[listItemId] ?? 0);
// Only re-renders when THIS item's count changes
```

---

## Category 4: UX Anti-patterns

### AP-UX-01: Sub-48px touch targets
```tsx
// FORBIDDEN
<button className="h-6 w-6">+</button>  // ← 24px, too small for gloved hands

// Correct
<Button size="lg" className="min-h-[48px] min-w-[48px]">+</Button>
```

---

### AP-UX-02: Modals during scan sessions
```tsx
// FORBIDDEN: interrupting the scan flow with a dialog
<AlertDialog>
  <AlertDialogTrigger>Mark Complete</AlertDialogTrigger>
  <AlertDialogContent>Are you sure?</AlertDialogContent>
</AlertDialog>

// Correct: inline state transition
<Button onClick={handleComplete}>Mark Complete</Button>
{showUndo && <InlineUndo onUndo={handleUndo} duration={4000} />}
```

---

### AP-UX-03: Animations over 150ms in operational contexts
```tsx
// FORBIDDEN in scan session interface
<motion.div
  transition={{ duration: 0.6, ease: "easeInOut" }}  // ← 600ms is too slow
>

// Correct: 0ms for state changes, ≤ 150ms for spatial transitions
className="transition-opacity duration-100"
```

---

### AP-UX-04: Icon-only actions without labels
```tsx
// FORBIDDEN: icon-only button for non-obvious actions
<Button><TrashIcon /></Button>

// Correct: always pair icon with text for actions
<Button variant="ghost" size="sm">
  <TrashIcon className="mr-2 h-4 w-4" />
  Remove
</Button>
```

---

## Category 5: AI Engineering Anti-patterns

### AP-AI-01: Raw AI output rendered in UI
```tsx
// FORBIDDEN: displaying unvalidated AI text
<p>{aiResponse.choices[0].message.content}</p>  // ← never render raw AI output

// Correct: parse, validate, sanitize first
const parsed = schema.safeParse(JSON.parse(content));
if (parsed.success) return <ItemPreview item={parsed.data} />;
```

---

### AP-AI-02: Missing confidence scores
```typescript
// FORBIDDEN: AI-parsed item without confidence
{ name: "Whole Milk", vendor: "Dean's", packSize: "4/CS" }

// Correct: confidence always required
{ name: "Whole Milk", vendor: "Dean's", packSize: "4/CS", confidence: 0.87, ocrSource: "..." }
```

---

### AP-AI-03: Hard-coding AI model names without versioning
```typescript
// FORBIDDEN: unpinned model
model: "gpt-4"

// Correct: always pin to a specific version
model: "gpt-4o-2024-08-06"
```
**Why**: OpenAI's model aliases (`gpt-4`, `gpt-4o`) point to different versions over time. Pinning ensures deterministic behavior.

---

## Rules

1. Reference this document in every PR that touches API, database, or AI code
2. Add new anti-patterns here when a pattern is discovered and corrected in review
3. AI coding agents must check this document before generating any of the affected code types
4. Each anti-pattern must include the correct alternative — just listing "don't" without "do" is unhelpful

---

## AI-Agent Instructions

Before generating code in any of the following areas, check the relevant anti-pattern category:
- tRPC routers → AP-ARCH-04
- Database schema → AP-DATA-04, AP-PERF-02
- Drizzle queries → AP-PERF-01
- AI parsing → AP-AI-01, AP-AI-02, AP-AI-03, AP-DATA-01
- Scan session components → AP-PERF-04, AP-UX-02, AP-UX-03
- Touch UI → AP-UX-01, AP-UX-04
- State management → AP-ARCH-05

---

## Production Considerations

- AP-PERF-01 (N+1 queries) should be caught in staging load testing before production
- AP-PERF-03 (blocking OCR) will time out in serverless environments with >10s limits
- AP-AI-03 (unpinned models) causes silent behavior changes after OpenAI model updates
- AP-DATA-02 (AI quantities) is the highest-risk anti-pattern — establish a lint rule or code review checklist item for it
