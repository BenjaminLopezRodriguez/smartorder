# SmartOrder — Inventory Search Philosophy & Architecture

## Purpose

Defines how inventory search works in SmartOrder. Search is a primary UX path for adding items to order lists and looking up catalog items. The search experience must be fast, forgiving of typos, and optimized for warehouse vocabulary — abbreviations, vendor shorthand, and partial product names.

---

## Responsibilities

- Define the search strategy (fuzzy, full-text, AI-assisted)
- Specify search ranking and relevance rules
- Establish the UX patterns for search interaction
- Define fallback behavior when search produces no results

---

## Search Strategy: Layered Approach

SmartOrder uses a three-layer search strategy:

```
User query
    ↓
Layer 1: Exact match (barcode, SKU)
    ↓ (if no match)
Layer 2: Fuzzy text match (fuse.js or pg_trgm)
    ↓ (if results < 3 or confidence < threshold)
Layer 3: AI semantic match (gpt-4o-mini) — optional, triggered on low-result queries
```

Most queries are resolved by Layer 1 or Layer 2. Layer 3 is an enhancement for difficult queries.

---

## Layer 1: Exact Match

Used when input is barcode-like (all digits, 8–14 characters) or an exact SKU match.

```typescript
// Exact barcode/SKU lookup
async function exactMatch(query: string, db: Database) {
  if (/^\d{8,14}$/.test(query)) {
    return db
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.barcode, query))
      .limit(1);
  }
  return [];
}
```

---

## Layer 2: Fuzzy Text Search

### Option A: `pg_trgm` (PostgreSQL trigram extension)

Pros: runs in the DB, no client-side dependency, scales with the catalog.

```sql
-- Enable extension once in migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for fast similarity search
CREATE INDEX catalog_item_name_trgm_idx ON smartorder_catalog_item
  USING gin (name gin_trgm_ops);

-- Query
SELECT *, similarity(name, $1) AS score
FROM smartorder_catalog_item
WHERE name % $1  -- % operator = similarity > threshold
ORDER BY score DESC
LIMIT 20;
```

```typescript
// In tRPC router
search: protectedProcedure
  .input(z.object({ query: z.string().min(1), limit: z.number().default(20) }))
  .query(async ({ ctx, input }) => {
    return ctx.db.execute(sql`
      SELECT *, similarity(name, ${input.query}) AS score
      FROM smartorder_catalog_item
      WHERE name % ${input.query}
         OR vendor % ${input.query}
      ORDER BY score DESC
      LIMIT ${input.limit}
    `);
  }),
```

### Option B: Fuse.js (client-side, for small catalogs < 5000 items)

Pros: instant results, no server round-trip.
Cons: catalog must be loaded into client memory; doesn't scale past ~5000 items.

```typescript
import Fuse from "fuse.js";

const fuse = new Fuse(catalogItems, {
  keys: [
    { name: "name", weight: 0.6 },
    { name: "vendor", weight: 0.3 },
    { name: "packSize", weight: 0.1 },
  ],
  threshold: 0.35, // lower = more strict
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
});

function fuseSearch(query: string) {
  return fuse.search(query).map(r => ({ ...r.item, score: 1 - (r.score ?? 0) }));
}
```

**Recommendation**: Start with Fuse.js for MVP. Migrate to `pg_trgm` when catalog exceeds 2000 items or search latency becomes noticeable.

---

## Search UX Patterns

### Trigger behavior

- Search triggers on every keystroke after 2 characters (not on Enter only)
- Debounce: 150ms (fast enough to feel instant; prevents thrash)
- Show results inline below the input — never open a new page for search results
- Show result count: "12 items found" or "No results for 'milk' — try 'dairy'"

### Query enhancements

Apply these transforms to the user query before searching:

```typescript
function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\boz\b/g, "ounce")
    .replace(/\bgal\b/g, "gallon")
    .replace(/\blb\b/g, "pound")
    .replace(/\bcs\b/g, "case")
    .replace(/\bpk\b/g, "pack")
    .replace(/\bqt\b/g, "quart")
    .replace(/\bpt\b/g, "pint");
}
```

### Result display

```tsx
// Search result item
<button
  className="flex items-center gap-3 w-full p-3 text-left hover:bg-accent rounded-md min-h-[56px]"
  onClick={() => onSelect(item)}
>
  <div className="min-w-0 flex-1">
    <p className="text-sm font-medium truncate">{item.name}</p>
    <p className="text-xs text-muted-foreground">
      {[item.vendor, item.packSize].filter(Boolean).join(" · ")}
    </p>
  </div>
  <Badge variant="outline" className="shrink-0">{item.unitType}</Badge>
</button>
```

### Empty state with suggestions

When search returns no results:
- Show: "No results for '[query]'"
- Suggest: category filter chips if category browsing is available
- Offer: "Add '[query]' as new item" (pre-fills the add form with the search query)

---

## Search in Scan Session Context

During an active scan session, search serves a different purpose: quickly finding an item to add to the list (voice or manual entry mode).

UX differences:
- Full-screen search overlay (not inline)
- Keyboard opens automatically
- First result is auto-selected on Enter / scan event
- No "add new item" option (session uses existing catalog only)

---

## Filter Chips

Alongside search, provide category filter chips for browsing:

```tsx
const filters = ["Dairy", "Deli", "Frozen", "Produce", "Dry Goods", "Beverages"];

<div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
  {filters.map(f => (
    <Button
      key={f}
      variant={activeFilter === f ? "default" : "outline"}
      size="sm"
      className="shrink-0"
      onClick={() => setActiveFilter(f)}
    >
      {f}
    </Button>
  ))}
</div>
```

---

## Search Ranking

When multiple matches have similar scores, rank by:

1. Exact prefix match (highest priority)
2. Vendor name match (user often searches by brand first)
3. Recently added to any list (proxy for current relevance)
4. Alphabetical (tiebreaker)

---

## Constraints

1. Search must respond visibly within 200ms on a catalog of 10,000 items
2. Fuzzy search never returns items with confidence < 0.3 (too-loose matches are noise)
3. Search normalizes abbreviations before matching — `oz` and `ounce` must match the same items
4. Voice search queries go through the same normalization pipeline as typed queries

---

## Anti-patterns

- Full-page navigation on search (breaks the workflow context)
- Empty search state that doesn't offer a next action
- Showing all catalog items before any query (too much noise)
- Displaying similarity scores to the user (unnecessary complexity)
- Triggering AI search on every query (use AI only as a last-resort fallback)

---

## Rules

1. Search debounce is 150ms — not 300ms (300ms feels sluggish on warehouse devices)
2. Results list is scrollable with a max height; it does not push page content down
3. The "Add new item" affordance appears only when search returns zero results
4. Voice queries use the same search pipeline as typed queries (after transcript normalization)
5. Search queries under 2 characters do not trigger a search (show placeholder state)

---

## AI-Agent Instructions

When implementing search:
1. Use the `normalizeQuery` utility before passing to fuse.js or pg_trgm
2. Debounce at 150ms — not higher
3. The result list must have `min-h-[56px]` per item (gloved touch)
4. Show result count alongside results ("12 items")
5. Empty state must include an "Add [query] as new item" button
6. For voice search: transcript → normalizeQuery → search (no extra AI step for matching unless fuzzy returns 0 results)

---

## Production Considerations

- `pg_trgm` index: add in the same migration as the column; do not add to production without an index
- Fuse.js with 10k items uses ~2MB RAM — acceptable for mobile, but monitor
- If switching from Fuse.js to `pg_trgm`: add a feature flag and test both paths in staging
- Consider caching the full catalog client-side with a React Query `staleTime` of 5 minutes (catalog rarely changes)
- Monitor p95 search latency in production — alert if > 300ms
