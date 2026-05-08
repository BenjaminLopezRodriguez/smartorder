import { z } from "zod";

// ---------------------------------------------------------------------------
// Provenance wrapper — every AI/OCR extracted field carries this
// ---------------------------------------------------------------------------

export const extractedValueSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
  sourcePage: z.number().int().positive().optional(),
  sourceLine: z.number().int().positive().optional(),
  extractionMethod: z
    .enum(["ocr", "ai-parse", "csv", "manual"])
    .default("ai-parse"),
});

export type ExtractedValue = z.infer<typeof extractedValueSchema>;

// ---------------------------------------------------------------------------
// Extracted catalog item — the shape AI must return for every parsed item
// ---------------------------------------------------------------------------

export const extractedCatalogItemSchema = z.object({
  name: extractedValueSchema,
  vendor: extractedValueSchema.nullable().default(null),
  category: extractedValueSchema.nullable().default(null),
  packSize: extractedValueSchema.nullable().default(null),
  unitType: extractedValueSchema
    .extend({ value: z.enum(["case", "unit", "each", "lb"]) })
    .default({ value: "case", confidence: 0.5, extractionMethod: "ai-parse" }),
  barcode: extractedValueSchema.nullable().default(null),
  ocrSource: z.string(),
  confidence: z.number().min(0).max(1),
});

export type ExtractedCatalogItem = z.infer<typeof extractedCatalogItemSchema>;

// ---------------------------------------------------------------------------
// Batch extraction response
// ---------------------------------------------------------------------------

export const ocrExtractionResultSchema = z.object({
  items: z.array(extractedCatalogItemSchema),
  pageCount: z.number().int().nonnegative().optional(),
  lowConfidenceCount: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

export type OcrExtractionResult = z.infer<typeof ocrExtractionResultSchema>;

// Low-confidence threshold per docs/ai/anti-hallucination.md
export const CONFIDENCE_THRESHOLD = 0.75;

export function isLowConfidence(item: ExtractedCatalogItem): boolean {
  return item.confidence < CONFIDENCE_THRESHOLD;
}
