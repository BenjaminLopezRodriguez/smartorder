# SmartOrder — AI Prompt Templates

## Purpose

This document contains the canonical prompt templates used for AI-powered features in SmartOrder. These templates are the result of testing against real order guide documents. AI coding agents must use these templates (or extend them) — do not generate new prompts from scratch without reading this document.

---

## Responsibilities

- Define the system and user prompts for each AI feature
- Establish the output schema for each prompt
- Document known failure modes and mitigation strategies
- Provide version history for prompts to track changes

---

## General Principles for All Prompts

1. Always use structured output mode (JSON schema) — never ask for free text
2. Instruct the model to return `null` for fields it cannot find (not invented values)
3. Always request a `confidence` score for each parsed item
4. Instruct the model to include the verbatim source text (`ocrSource`) for each item
5. Include explicit instructions to handle edge cases (partial text, damaged scan, multi-column layouts)
6. Keep system prompts focused and short — under 500 tokens
7. Test prompts against real OCR output before deploying

---

## Template 1: Order Guide OCR Parsing

**Feature**: Parse structured items from AWS Textract OCR output of a paper/PDF order guide.

**Model**: `gpt-4o-2024-08-06` (structured outputs)

**System prompt:**
```
You are a warehouse inventory parsing assistant.

You will receive raw OCR text from a paper or PDF order guide used in grocery, foodservice, or retail distribution.

Your job is to extract a list of catalog items from the text.

Rules:
- Extract ONLY items you can see clearly in the source text
- Return null for any field you cannot determine from the text
- Do NOT invent product names, pack sizes, or vendor information
- Do NOT round up or invent confidence scores
- Include the exact OCR text snippet that produced each item in "ocrSource"
- If the text is too degraded to parse reliably, return an empty items array with parseQuality "low"
- Pack sizes appear as formats like: "4/1GAL", "12/16OZ", "6/CS", "1/EACH"
- Unit types: "case" for multi-pack, "unit" for single-count, "each" for individual items, "lb" for by-weight
```

**Zod schema:**
```typescript
import { z } from "zod";

export const OrderGuideParseSchema = z.object({
  items: z.array(z.object({
    name: z.string().describe("Product name, cleaned and title-cased"),
    vendor: z.string().nullable().describe("Distributor or brand name if present"),
    packSize: z.string().nullable().describe("Pack size as found in text, e.g. '4/1GAL', '12CS'"),
    unitType: z.enum(["case", "unit", "each", "lb"]),
    barcode: z.string().nullable().describe("UPC or barcode if present in text"),
    sku: z.string().nullable().describe("Vendor SKU or item number if present"),
    confidence: z.number().min(0).max(1).describe("Confidence 0-1 for this item extraction"),
    ocrSource: z.string().describe("The verbatim OCR text this item was parsed from"),
  })),
  parseQuality: z.enum(["high", "medium", "low"]).describe("Overall quality of the OCR source"),
  rawLineCount: z.number().describe("Total number of lines in the source text"),
  parsedItemCount: z.number().describe("How many items were successfully extracted"),
  documentType: z.enum(["order_guide", "invoice", "receiving_sheet", "unknown"]),
  warnings: z.array(z.string()).describe("Any notable issues with parsing"),
});

export type OrderGuideParseResult = z.infer<typeof OrderGuideParseSchema>;
```

**User prompt template:**
```typescript
function buildOrderGuideParsePrompt(ocrText: string, pageHint?: number): string {
  return `Parse the following OCR text from a warehouse order guide.
${pageHint ? `This is page ${pageHint} of the document.` : ""}

OCR TEXT:
---
${ocrText}
---

Extract all inventory items you can find. For each item, include its source text.`;
}
```

**Known failure modes:**

| Failure | Cause | Mitigation |
|---|---|---|
| Merged item names | Poor OCR on column separators | Post-process: flag items with 2+ apparent names |
| Price mistaken for pack size | Price format similar to pack size | Filter: pack sizes with `$` are likely prices |
| Header rows as items | Page headers parsed as products | Filter: items with confidence < 0.3 |
| Column bleed | Multi-column layouts parsed linearly | Textract table detection (use AnalyzeDocument, not DetectText) |

---

## Template 2: Inventory Item Matching

**Feature**: Match a scanned barcode or voice-input product name to a catalog item.

**Model**: `gpt-4o-mini-2024-07-18` (faster, cheaper for real-time matching)

**System prompt:**
```
You are a warehouse inventory matching assistant.

Given a user query (barcode, product name, or partial description) and a list of catalog items, 
identify the best matching item.

Rules:
- Only match against the provided catalog items — do not suggest items not in the list
- Return null if no good match exists (do not force a low-quality match)
- Match threshold: only return a match if confidence >= 0.65
- Consider common abbreviations: "gal" = "gallon", "oz" = "ounce", "lb" = "pound", "cs" = "case"
- Consider vendor name variations: "Dean's" = "Deans" = "DEANS"
- Pack size can help disambiguate: "milk 1 gal" vs "milk 1/2 gal"
```

**Schema:**
```typescript
export const InventoryMatchSchema = z.object({
  match: z.object({
    catalogItemId: z.string().uuid(),
    name: z.string(),
    confidence: z.number().min(0).max(1),
    matchReason: z.string().describe("Why this item was matched"),
  }).nullable(),
  alternatives: z.array(z.object({
    catalogItemId: z.string().uuid(),
    name: z.string(),
    confidence: z.number().min(0).max(1),
  })).max(3).describe("Up to 3 alternative matches if primary match is uncertain"),
});
```

**Note:** For most matching, use fuzzy search (fuse.js) first — only fall back to AI matching when fuzzy search confidence is below threshold. AI matching is slower and more expensive.

---

## Template 3: BackroomVision Item Count Estimation

**Feature**: Estimate item counts from a backroom snapshot image.

**Model**: `gpt-4o-2024-08-06` (vision-capable)

**System prompt:**
```
You are a warehouse inventory vision assistant.

You will receive an image of a store backroom or stockroom shelf.
Your job is to estimate counts of visible product units (cases, bottles, containers, etc.).

Rules:
- Count only what you can clearly see — do not estimate what might be behind other items
- Group similar items together (e.g., all cases of the same product)
- Return each identified item group with a count range (min, max) reflecting uncertainty
- If image quality is too poor to count reliably, say so — do not guess
- Do not identify specific product names unless clearly legible on packaging
- Confidence reflects both image quality and count certainty
```

**Schema:**
```typescript
export const BackroomVisionSchema = z.object({
  itemGroups: z.array(z.object({
    description: z.string().describe("Brief visual description of the product group"),
    countMin: z.number().int().describe("Minimum visible count"),
    countMax: z.number().int().describe("Maximum visible count"),
    unitType: z.enum(["case", "unit", "pallet", "unknown"]),
    confidence: z.number().min(0).max(1),
    boundingBoxHint: z.string().nullable().describe("Rough location in image: 'top-left', 'bottom-center', etc."),
  })),
  imageQuality: z.enum(["good", "fair", "poor"]),
  totalItemGroups: z.number(),
  warnings: z.array(z.string()),
});
```

---

## Template 4: Voice Input Parsing

**Feature**: Parse a voice-spoken product query into a structured search.

**Model**: `gpt-4o-mini-2024-07-18`

**System prompt:**
```
You are a warehouse voice search assistant.

The user has spoken a product name or description while working in a backroom.
Convert their speech into a structured search query.

Rules:
- Extract the product name, pack size (if mentioned), and quantity (if mentioned)
- Handle common speech patterns: "whole milk one gallon four cases" or "get me some OJ"
- Strip filler words ("um", "uh", "I need", "get me", "find")
- Expand common abbreviations: "gal" → "gallon", "OJ" → "orange juice"
- Preserve vendor names when spoken: "Dean's milk" → vendor: "Dean's"
```

**Schema:**
```typescript
export const VoiceSearchSchema = z.object({
  productName: z.string().describe("Cleaned product name"),
  vendor: z.string().nullable(),
  packSize: z.string().nullable(),
  quantity: z.number().nullable().describe("Quantity mentioned, if any"),
  unitType: z.enum(["case", "unit", "each", "lb"]).nullable(),
  confidence: z.number().min(0).max(1),
  originalTranscript: z.string().describe("The original speech-to-text input"),
});
```

---

## Prompt Engineering Standards

### Do not:
- Ask the model to "try its best" (invites hallucination)
- Omit schema descriptions (reduces output quality)
- Use temperature > 0 for structured parsing (use temperature: 0)
- Use `response_format: { type: "json_object" }` — always use JSON schema mode instead
- Put UI instructions in the system prompt (those belong in the frontend)

### Always:
- Set `temperature: 0` for deterministic parsing
- Set `max_tokens` appropriate to expected output size
- Include `seed` for reproducible testing in development
- Log `usage.prompt_tokens`, `usage.completion_tokens`, and `usage.total_tokens`

### OpenAI call wrapper (canonical implementation):
```typescript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseWithStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  schemaName: string,
): Promise<{ data: T; usage: { promptTokens: number; completionTokens: number } }> {
  const response = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(schema, schemaName),
  });

  const parsed = response.choices[0]?.message.parsed;
  if (!parsed) throw new Error("OpenAI returned null parsed response");

  return {
    data: parsed,
    usage: {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
```

---

## Anti-patterns

- Parsing free-text AI responses with custom regex or string manipulation
- Asking AI to "estimate" quantities for inventory counts
- Using GPT-4o for every request when gpt-4o-mini suffices for matching
- Not logging token usage (makes cost monitoring impossible)
- Prompts that allow the model to return partial JSON (always use structured outputs)

---

## Rules

1. All new AI features must use a template from this document or add a new template here
2. Template changes must include the model version, date, and reason for change
3. Test templates against the real OCR output samples in `tests/fixtures/ocr/`
4. Prompts are deployed code — treat them with the same review rigor as application code

---

## AI-Agent Instructions

When implementing a new AI feature:
1. Choose the closest existing template from this document
2. Extend the schema rather than creating a new one from scratch
3. Use `parseWithStructuredOutput` wrapper — never call OpenAI SDK directly in router code
4. Add the new template to this document with model version and purpose
5. Set temperature to 0 for all parsing tasks

---

## Production Considerations

- Textract → OpenAI pipeline cost estimate: ~$0.02–$0.08 per page of order guide
- Monitor costs via token usage logging — alert if a single job exceeds 50k tokens
- Implement per-user rate limits on OCR import to prevent cost abuse
- Cache parsed results by source document hash — identical uploads should not re-parse
- `gpt-4o-mini` is suitable for matching; reserve `gpt-4o` for initial order guide parsing
