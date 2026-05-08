# SmartOrder — Structured Output Standards

## Purpose

Defines the standards for using OpenAI's structured output feature in SmartOrder. Structured outputs are the only acceptable way to consume AI-generated data in this application. This document defines the schemas, validation rules, and implementation patterns.

---

## Responsibilities

- Define the canonical Zod schemas for each AI feature
- Establish validation requirements before any DB writes
- Document versioning and schema evolution strategy
- Define the error handling for schema mismatches

---

## Why Structured Outputs (Not Free Text)

SmartOrder processes AI output into database records. Free-text parsing with regex is:
- Fragile (breaks on model updates)
- Untestable (no schema to validate against)
- Unsafe (partial writes possible)

OpenAI's JSON schema mode + Zod validation provides:
- Guaranteed JSON response format
- Type-safe access in TypeScript
- Validation before any DB write
- Testable schemas (unit test them independently)

---

## Implementation Standard

Always use the `zodResponseFormat` helper from `openai/helpers/zod`:

```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI();

const response = await openai.beta.chat.completions.parse({
  model: "gpt-4o-2024-08-06",  // structured outputs require gpt-4o (not gpt-4o-mini)
  temperature: 0,
  messages: [...],
  response_format: zodResponseFormat(MySchema, "my_schema_name"),
});

// response.choices[0].message.parsed is typed as z.infer<typeof MySchema>
const parsed = response.choices[0]?.message.parsed;
if (!parsed) throw new Error("null parsed response");
```

---

## Canonical Schemas

All schemas live in `src/lib/ai/schemas.ts`.

### Order guide parse schema

```typescript
// src/lib/ai/schemas.ts
export const ParsedItemSchema = z.object({
  name: z.string().min(1).describe("Product name, cleaned and title-cased"),
  vendor: z.string().nullable().describe("Distributor or brand name if present in text"),
  packSize: z.string().nullable().describe("Pack size as found in text, e.g. '4/1GAL'"),
  unitType: z.enum(["case", "unit", "each", "lb"]).default("case"),
  barcode: z.string().nullable().describe("UPC or barcode — return null if not in source"),
  sku: z.string().nullable().describe("Vendor SKU if present"),
  confidence: z.number().min(0).max(1),
  ocrSource: z.string().describe("Verbatim OCR text this item was parsed from"),
});

export const OrderGuideParseSchema = z.object({
  items: z.array(ParsedItemSchema),
  parseQuality: z.enum(["high", "medium", "low"]),
  rawLineCount: z.number().int(),
  parsedItemCount: z.number().int(),
  documentType: z.enum(["order_guide", "invoice", "receiving_sheet", "unknown"]),
  warnings: z.array(z.string()),
});

export type OrderGuideParseResult = z.infer<typeof OrderGuideParseSchema>;
export type ParsedItem = z.infer<typeof ParsedItemSchema>;
```

### Inventory match schema

```typescript
export const InventoryMatchSchema = z.object({
  match: z.object({
    catalogItemId: z.string().uuid(),
    name: z.string(),
    confidence: z.number().min(0).max(1),
    matchReason: z.string(),
  }).nullable(),
  alternatives: z.array(z.object({
    catalogItemId: z.string().uuid(),
    name: z.string(),
    confidence: z.number().min(0).max(1),
  })).max(3),
});

export type InventoryMatchResult = z.infer<typeof InventoryMatchSchema>;
```

### Voice search schema

```typescript
export const VoiceSearchSchema = z.object({
  productName: z.string().describe("Cleaned product name"),
  vendor: z.string().nullable(),
  packSize: z.string().nullable(),
  quantity: z.number().int().nullable().describe("Quantity mentioned, if any"),
  unitType: z.enum(["case", "unit", "each", "lb"]).nullable(),
  confidence: z.number().min(0).max(1),
  originalTranscript: z.string(),
});

export type VoiceSearchResult = z.infer<typeof VoiceSearchSchema>;
```

### BackroomVision schema

```typescript
export const BackroomItemGroupSchema = z.object({
  description: z.string(),
  countMin: z.number().int().min(0),
  countMax: z.number().int().min(0),
  unitType: z.enum(["case", "unit", "pallet", "unknown"]),
  confidence: z.number().min(0).max(1),
  location: z.string().nullable().describe("Position in image: top-left, center, etc."),
});

export const BackroomVisionSchema = z.object({
  itemGroups: z.array(BackroomItemGroupSchema),
  imageQuality: z.enum(["good", "fair", "poor"]),
  totalItemGroups: z.number().int(),
  warnings: z.array(z.string()),
});

export type BackroomVisionResult = z.infer<typeof BackroomVisionSchema>;
```

---

## Validation Before DB Write

Every structured output must be validated before any database operation:

```typescript
// Pattern: always use safeParse
const rawContent = response.choices[0]?.message.content;
if (!rawContent) throw new AIParseError("empty_response");

const validation = OrderGuideParseSchema.safeParse(JSON.parse(rawContent));
if (!validation.success) {
  logger.error("ai.schema.validation_failed", {
    errors: validation.error.issues.map(i => i.message).join(", "),
    rawContent: rawContent.substring(0, 200),
  });
  throw new AIParseError("schema_mismatch");
}

const result = validation.data;
// Only now write to DB
```

When using `zodResponseFormat` (recommended), the SDK validates automatically:
```typescript
// With zodResponseFormat: response.choices[0].message.parsed is already validated
// but check for null (model may refuse to respond to some inputs)
const parsed = response.choices[0]?.message.parsed;
if (!parsed) throw new AIParseError("refused_response");
```

---

## Schema Versioning

When a schema changes:
1. Add new fields as optional/nullable (backward compatible)
2. Never remove required fields (would break existing parsed records)
3. Version the schema name in `zodResponseFormat`:
   ```typescript
   zodResponseFormat(OrderGuideParseSchema, "order_guide_parse_v2")
   ```
4. Document the change in this file with a date and reason

### Schema change log

| Schema | Version | Date | Change |
|---|---|---|---|
| `OrderGuideParseSchema` | v1 | Initial | — |
| `InventoryMatchSchema` | v1 | Initial | — |
| `VoiceSearchSchema` | v1 | Initial | — |
| `BackroomVisionSchema` | v1 | Initial | — |

---

## Error Types

```typescript
// src/lib/ai/errors.ts
export type AIParseErrorType =
  | "empty_response"
  | "schema_mismatch"
  | "refused_response"
  | "rate_limit"
  | "timeout"
  | "zero_items";

export class AIParseError extends Error {
  constructor(
    public readonly type: AIParseErrorType,
    message?: string
  ) {
    super(message ?? `AI parse error: ${type}`);
    this.name = "AIParseError";
  }
}
```

---

## Testing Schemas

Each schema should be independently unit-tested:

```typescript
// src/lib/ai/schemas.test.ts
describe("OrderGuideParseSchema", () => {
  it("accepts valid parsed output", () => {
    const valid = {
      items: [{
        name: "Whole Milk 1 Gallon",
        vendor: "Dean's",
        packSize: "4/CS",
        unitType: "case",
        barcode: null,
        sku: null,
        confidence: 0.92,
        ocrSource: "WHOLE MILK 1 GAL DEANS 4/CS $18.50",
      }],
      parseQuality: "high",
      rawLineCount: 47,
      parsedItemCount: 12,
      documentType: "order_guide",
      warnings: [],
    };
    expect(OrderGuideParseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects confidence values > 1", () => {
    // ...
    expect(OrderGuideParseSchema.safeParse({ ...valid, items: [{ ...item, confidence: 1.5 }] }).success).toBe(false);
  });
});
```

---

## Anti-patterns

- Calling `JSON.parse` on AI output without Zod validation
- Using `as SomeType` to type-cast AI output (not validated)
- Schemas without `.describe()` on fields (reduces output quality)
- Schema fields that allow empty strings instead of `null` for absent data
- Using `gpt-4o-mini` for structured outputs (not supported — use `gpt-4o` or `gpt-4o-mini-2024-07-18` which does support it after the model cutoff)

---

## AI-Agent Instructions

When adding a new AI feature:
1. Add the Zod schema to `src/lib/ai/schemas.ts` before writing the prompt
2. Use `zodResponseFormat` from `openai/helpers/zod`
3. Add the schema to the schema change log in this document
4. Write unit tests for the schema in `src/lib/ai/schemas.test.ts`
5. Validate with `.safeParse()` before using `response.parsed` — check for null

---

## Production Considerations

- `zodResponseFormat` ensures the model cannot return malformed JSON
- If `message.parsed` is null, the model refused (usually safety filters) — handle gracefully
- Schema validation errors should alert (they indicate a model behavior change)
- Pin model versions — schema behavior changes on model updates
