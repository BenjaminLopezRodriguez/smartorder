# SmartOrder — AI Anti-Hallucination Rules

## Purpose

This document defines the rules that prevent AI systems from producing unreliable, invented, or unverifiable data in SmartOrder. Inventory data is consequential — a wrong quantity or wrong item name leads to real operational errors. These rules are mandatory, not advisory.

---

## Responsibilities

- Define confidence scoring requirements for all AI-produced data
- Establish provenance tracking for OCR-derived records
- Set the threshold for automatic vs. human-reviewed application
- Define retry and fallback behavior for AI calls
- Prevent AI suggestions from silently corrupting inventory data

---

## Core Principle

> **AI in SmartOrder produces candidates for human review, not authoritative data.**

AI can accelerate data entry and reduce manual effort. It cannot and must not silently assert facts about inventory. Every AI-produced value must carry:
1. A confidence score (0.0–1.0)
2. The source it was derived from
3. A mechanism for human correction

---

## Confidence Score Requirements

### Thresholds

| Score range | Meaning | Required action |
|---|---|---|
| 0.90 – 1.00 | High confidence | Can auto-apply with user notification |
| 0.75 – 0.89 | Medium confidence | Flag in UI, user confirms before applying |
| 0.50 – 0.74 | Low confidence | Require explicit user review and confirmation |
| 0.00 – 0.49 | Very low | Show raw OCR source only, require manual entry |

### Confidence fields are required

Every AI-produced record must include confidence:

```typescript
// Required shape for any AI-parsed catalog item
type ParsedCatalogItem = {
  name: string;
  vendor: string | null;
  packSize: string | null;
  unitType: "case" | "unit" | "each" | "lb";
  barcode: string | null;
  confidence: number;          // REQUIRED: 0.0–1.0
  ocrSource: string;           // REQUIRED: raw OCR text this came from
  confidenceBreakdown?: {      // Optional: per-field confidence
    name: number;
    vendor: number;
    packSize: number;
    unitType: number;
  };
};
```

---

## Provenance Rules

Every AI-derived record must be traceable to its source:

### OCR Provenance
- Store the raw Textract output in a `ocrRawText` field on the source document record
- Each parsed item references the exact text chunk it was extracted from
- The UI must show "Parsed from: [raw OCR text]" when a user reviews a low-confidence item
- Never delete raw OCR output until the parsed items are confirmed

### AI Parsing Provenance
- Log every OpenAI call: model, prompt hash, input token count, output token count, latency, timestamp
- Store the raw JSON response alongside the parsed result for debugging
- If a user corrects an AI-produced value, log the correction (original AI value, user value, timestamp)

### Database fields for provenance
```sql
-- On catalog_item table (extend schema.ts with these)
aiGenerated        boolean default false
aiConfidence       real
ocrSource          text           -- raw OCR text chunk
aiProvenanceJobId  uuid           -- references the OCR job record
userCorrected      boolean default false
userCorrectedAt    timestamp
```

---

## Rules for AI Calls

### 1. Always use structured outputs
Never parse AI free-text responses with regex or custom parsers. Use OpenAI's structured output mode with a validated Zod schema.

```typescript
import { z } from "zod";

const CatalogItemListSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    vendor: z.string().nullable(),
    packSize: z.string().nullable(),
    unitType: z.enum(["case", "unit", "each", "lb"]).default("case"),
    barcode: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    ocrSource: z.string(),
  })),
  parseQuality: z.enum(["high", "medium", "low"]),
  rawLineCount: z.number(),
  parsedItemCount: z.number(),
});
```

### 2. Validate AI output before any DB write
Even structured outputs can pass malformed data. Always validate the full response with Zod before touching the database.

```typescript
const result = CatalogItemListSchema.safeParse(aiResponse);
if (!result.success) {
  // Log the validation error and raw response
  // Return a partial-success response with error context
  // Never silently drop items or write corrupt data
}
```

### 3. Batch AI results — never stream to DB
Parse the full AI response, validate it, present it for review, then write confirmed items. Never stream AI output directly to database writes.

### 4. Handle AI failures gracefully
```typescript
type AIParseResult =
  | { success: true; items: ParsedCatalogItem[]; jobId: string }
  | { success: false; error: "rate_limit" | "timeout" | "invalid_response" | "parse_error"; rawText: string; partial?: ParsedCatalogItem[] };
```

On failure: return `rawText` so the user can manually entry-check, never return an empty result without explanation.

### 5. Retry with exponential backoff

```typescript
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = isRateLimitError(err) || isServerError(err);
      if (!isRetryable || attempt === maxRetries) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw new Error("unreachable");
}
```

---

## UI Rules for AI-Produced Data

### 1. Confidence indicators must be visible
Low-confidence items must be visually distinct:
```tsx
// Low confidence item indicator
{item.confidence < 0.75 && (
  <Badge variant="outline" className="text-amber-600 border-amber-300">
    Review needed
  </Badge>
)}
```

### 2. Show the source
When a user reviews a low-confidence item, show what the AI saw:
```tsx
{item.ocrSource && (
  <details className="text-xs text-muted-foreground mt-1">
    <summary>OCR source</summary>
    <pre className="mt-1 font-mono whitespace-pre-wrap">{item.ocrSource}</pre>
  </details>
)}
```

### 3. Corrections are always possible
Every AI-produced field must have an edit affordance. Corrections are saved and used to improve future parsing (if a correction log is implemented).

### 4. Bulk actions on low-confidence items
The review UI must allow:
- Accept all high-confidence items at once
- Review low-confidence items one by one
- Reject an item entirely (do not add to catalog)
- Edit before accepting

---

## Anti-patterns

- **Silent writes**: never write AI-parsed data to the DB without user confirmation on first import
- **Fabricated fields**: if the OCR text doesn't contain vendor info, return `null`, never invent a vendor
- **Confidence washing**: never round up confidence scores to avoid review prompts
- **Missing provenance**: never create a catalog item without recording its `ocrSource`
- **AI quantity decisions**: never auto-fill `targetCases` or `scannedCases` from AI — only from explicit user input
- **Hallucinated barcodes**: if a barcode is not present in the OCR source, return `null` — never construct one
- **Merging without confirmation**: never auto-merge two items that "look similar" without explicit user approval

---

## Examples

**Correct OCR parse flow:**
```
Raw OCR text: "WHOLE MILK 1 GAL 4/CS DEAN'S $18.50"
                                              ↓
AI output:
{
  name: "Whole Milk 1 Gallon",
  vendor: "Dean's",
  packSize: "4/CS",
  unitType: "case",
  barcode: null,
  confidence: 0.88,
  ocrSource: "WHOLE MILK 1 GAL 4/CS DEAN'S $18.50"
}
                                              ↓
UI shows: "Review needed" badge (0.88 < 0.90)
User confirms → item written to catalog with aiConfidence: 0.88
```

**Incorrect (forbidden) flow:**
```
Raw OCR text: "WHL MLK 1G DEAN 4C"
                        ↓
AI invents: barcode "012345678901"  ← FORBIDDEN: not in source
AI rounds up confidence to 0.95    ← FORBIDDEN: confidence washing
AI writes to DB without review     ← FORBIDDEN: no user confirmation
```

---

## Implementation Guidance

1. Create `src/lib/ai/parse-order-guide.ts` — all OCR parsing logic
2. Create `src/lib/ai/confidence.ts` — confidence threshold helpers and UI badge logic
3. Create `src/server/api/routers/ocr.ts` — async job management
4. Never import AI libs directly in component files
5. Add `aiConfidence` column to `catalogItems` when implementing OCR import
6. Add `ocrJobs` table to track async Textract processing status

---

## AI-Agent Instructions

When implementing any AI-powered feature in SmartOrder:
1. Every AI output field must have a corresponding confidence score
2. Every AI-produced DB record must have an `ocrSource` or equivalent provenance field
3. No AI value writes to the database without passing through a Zod validation step
4. No AI value writes to the database without a user confirmation step (first import)
5. Return typed union results: `{ success: true, data } | { success: false, error, rawText }`
6. Log all AI call metadata — model, latency, token count — to a structured log

---

## Production Considerations

- Set OpenAI model version explicitly (never `gpt-4` — always `gpt-4o-2024-08-06` or specific pinned version)
- Monitor AI call costs via token count logging — Textract + OpenAI costs can spike on large order guides
- Implement circuit breaker: if AI error rate > 10% in a 5-minute window, disable auto-parsing and fall back to manual entry
- Store AI parse logs in a separate table with retention policy (90 days by default)
- Never expose raw AI responses to the client — parse and sanitize server-side before returning
