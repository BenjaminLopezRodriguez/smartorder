# SmartOrder — Inventory Matching Logic

## Purpose

Defines how SmartOrder matches user input (voice queries, typed search, scanned barcodes, OCR-parsed names) to existing catalog items. Matching is a core workflow step — poor matching breaks the scan session and frustrates workers under time pressure.

---

## Responsibilities

- Define the matching pipeline for each input type
- Establish scoring and confidence thresholds
- Define the behavior for ambiguous matches
- Specify how matches are confirmed and corrected

---

## Input Types and Matching Strategies

| Input type | Primary strategy | Fallback |
|---|---|---|
| Barcode (UPC/EAN) | Exact lookup on `barcode` field | None — barcodes are unique |
| SKU | Exact lookup on `sku` field | Fuzzy on `name` |
| Typed query (≥ 3 chars) | Fuzzy text search | AI semantic match |
| Voice transcript | Normalize → fuzzy text search | AI semantic match |
| OCR parsed name | Fuzzy text search + AI match | Human review |

---

## Matching Pipeline

```typescript
// src/lib/inventory-match.ts

export type MatchResult = {
  item: CatalogItem;
  confidence: number;  // 0.0–1.0
  matchMethod: "exact_barcode" | "exact_sku" | "fuzzy_text" | "ai_semantic";
  alternatives: Array<{ item: CatalogItem; confidence: number }>;
};

export async function matchInventoryItem(
  query: string,
  catalog: CatalogItem[],
): Promise<MatchResult | null> {

  // Stage 1: Exact barcode match
  if (isBarcode(query)) {
    const exact = catalog.find(i => i.barcode === query);
    if (exact) return { item: exact, confidence: 1.0, matchMethod: "exact_barcode", alternatives: [] };
    return null; // barcode miss = item not in catalog, do not fuzzy match
  }

  // Stage 2: Fuzzy text match
  const normalized = normalizeQuery(query);
  const fuzzyResults = fuseSearch(normalized, catalog);

  if (fuzzyResults.length > 0 && fuzzyResults[0].confidence >= 0.65) {
    return {
      item: fuzzyResults[0].item,
      confidence: fuzzyResults[0].confidence,
      matchMethod: "fuzzy_text",
      alternatives: fuzzyResults.slice(1, 4),
    };
  }

  // Stage 3: AI semantic match (only for < 3 fuzzy results with low confidence)
  if (fuzzyResults.length < 3) {
    const aiMatch = await aiSemanticMatch(normalized, catalog.slice(0, 200));
    if (aiMatch && aiMatch.confidence >= 0.65) {
      return { ...aiMatch, matchMethod: "ai_semantic" };
    }
  }

  return null;
}
```

---

## Query Normalization

```typescript
// src/lib/inventory-match.ts

const ABBREVIATION_MAP: Record<string, string> = {
  "oz": "ounce",
  "gal": "gallon",
  "lb": "pound",
  "lbs": "pounds",
  "cs": "case",
  "ct": "count",
  "pk": "pack",
  "qt": "quart",
  "pt": "pint",
  "doz": "dozen",
  "oj": "orange juice",
  "wh": "whole",
  "choc": "chocolate",
  "chkn": "chicken",
};

export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")          // remove punctuation
    .split(/\s+/)
    .map(word => ABBREVIATION_MAP[word] ?? word)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
```

---

## Barcode Detection

```typescript
function isBarcode(input: string): boolean {
  const cleaned = input.replace(/\s/g, "");
  // UPC-A (12), EAN-13 (13), UPC-E (8), EAN-8 (8), GTIN-14 (14)
  return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(cleaned);
}
```

---

## Fuzzy Match Configuration (Fuse.js)

```typescript
import Fuse from "fuse.js";

function createFuseIndex(catalog: CatalogItem[]): Fuse<CatalogItem> {
  return new Fuse(catalog, {
    keys: [
      { name: "name", weight: 0.55 },
      { name: "vendor", weight: 0.25 },
      { name: "packSize", weight: 0.10 },
      { name: "category", weight: 0.10 },
    ],
    threshold: 0.4,         // 0 = perfect match, 1 = match anything
    distance: 100,          // how far from start of string to look
    minMatchCharLength: 2,
    includeScore: true,
    ignoreLocation: true,   // match anywhere in the string
    useExtendedSearch: false,
  });
}

type FuseResult = { item: CatalogItem; confidence: number };

function fuseSearch(query: string, catalog: CatalogItem[]): FuseResult[] {
  const fuse = createFuseIndex(catalog);
  return fuse.search(query).map(r => ({
    item: r.item,
    confidence: 1 - (r.score ?? 1), // Fuse score is "distance", invert it
  }));
}
```

---

## Confidence Thresholds

| Threshold | Behavior |
|---|---|
| ≥ 0.90 | Auto-select in scan session (with visual confirmation) |
| 0.65 – 0.89 | Show as primary suggestion, require tap to confirm |
| 0.40 – 0.64 | Show top 3 alternatives, require explicit selection |
| < 0.40 | No match — offer "Add new item" or "Search again" |

In scan session context:
- Auto-select threshold is raised to 0.95 (scan sessions are time-critical — false matches are costly)
- Show top match + 2 alternatives side by side for 0.65–0.94 results

---

## Ambiguous Match UI

When multiple items score within 0.10 of each other:

```tsx
// Disambiguation prompt (within scan session)
<div className="space-y-2">
  <p className="text-sm font-medium text-muted-foreground">
    Multiple matches — which item?
  </p>
  {alternatives.map(alt => (
    <button
      key={alt.item.id}
      className="w-full text-left p-3 border rounded-md min-h-[56px] hover:bg-accent"
      onClick={() => onSelect(alt.item)}
    >
      <p className="font-medium text-sm">{alt.item.name}</p>
      <p className="text-xs text-muted-foreground">
        {[alt.item.vendor, alt.item.packSize].filter(Boolean).join(" · ")}
      </p>
    </button>
  ))}
  <Button variant="ghost" size="sm" onClick={onManualEntry}>
    None of these — enter manually
  </Button>
</div>
```

---

## Match Correction Flow

When a match is confirmed incorrectly:
1. User taps the item name to open edit mode
2. Correction: either pick a different catalog item or adjust the count
3. The original match confidence is logged alongside the correction (for future model improvement)
4. The correction does NOT update the catalog item — it updates the list item's catalog reference

---

## OCR → Catalog Matching

When OCR produces parsed items, they need to be matched to existing catalog items (to prevent duplicates):

```typescript
export async function matchOCRItemToCatalog(
  parsed: ParsedCatalogItem,
  existingCatalog: CatalogItem[],
): Promise<{ isNew: boolean; match?: CatalogItem; confidence: number }> {

  // First: try barcode match
  if (parsed.barcode) {
    const exact = existingCatalog.find(i => i.barcode === parsed.barcode);
    if (exact) return { isNew: false, match: exact, confidence: 1.0 };
  }

  // Then: fuzzy name match
  const results = fuseSearch(normalizeQuery(parsed.name), existingCatalog);
  if (results.length > 0 && results[0].confidence >= 0.80) {
    return { isNew: false, match: results[0].item, confidence: results[0].confidence };
  }

  // No match: this is a new catalog item
  return { isNew: true, confidence: 1.0 };
}
```

---

## Constraints

1. Barcode misses are terminal — never fuzzy-match on a barcode input
2. Confidence scores are never rounded up to pass a threshold
3. AI semantic matching is never called for every query — only as a fallback for < 3 fuzzy results
4. All match decisions are logged with the query, match method, confidence, and whether the user confirmed

---

## Anti-patterns

- Auto-selecting matches below 0.90 in scan sessions (creates silent errors)
- Skipping normalization (queries with "oz" fail to match items with "ounce")
- Using AI matching for every query (slow + expensive)
- Returning more than 5 alternatives (cognitive overload)
- Treating a 0.50 confidence match as the same as a 0.95 match

---

## Rules

1. Barcode input goes to exact lookup only (no fuzzy fallback)
2. Normalize all text queries before fuzzy matching
3. Show confidence to the system, not to the user (confidence is an implementation detail)
4. Provide a "None of these" escape hatch in all disambiguation UIs
5. Log all match events — query, method, result, user action

---

## AI-Agent Instructions

When implementing matching:
1. Use the `matchInventoryItem` function as the canonical entry point — do not bypass it
2. Abbreviation normalization must happen before any matching attempt
3. AI semantic matching is a background enhancement — the app must work without it
4. Never return a confidence score that was inflated to pass a threshold
5. The disambiguation UI must work one-handed (56px min-height per option)

---

## Production Considerations

- Fuse.js index must be built from the full catalog, not a filtered subset
- Re-index when catalog changes (on mutation success in the client)
- For catalogs > 5000 items, migrate to `pg_trgm` server-side search
- Log false positives (user selected a different item than the top match) to improve threshold tuning
- AI semantic matching rate limit: implement a per-user monthly cap to prevent cost abuse
