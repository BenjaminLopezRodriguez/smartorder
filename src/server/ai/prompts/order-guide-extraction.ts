/**
 * Versioned prompts for order guide extraction.
 * Bump the version key when changing prompt text so callers can track which
 * prompt produced a given set of extracted items.
 */

export const ORDER_GUIDE_EXTRACTION_V1 = {
  version: "order-guide-extraction-v1",

  system: `You are an inventory data extraction assistant for a warehouse management system.
Your task is to extract structured product information from order guide documents.

Rules:
- Extract every line item you can identify as a product
- Preserve the exact raw text in ocrSource for every item
- Assign a confidence score (0.0–1.0) based on how clearly the field was readable
- Use confidence < 0.5 for fields you are guessing
- Use confidence >= 0.9 only when the text is clearly legible and unambiguous
- Never invent product names, barcodes, or quantities — if uncertain, leave null
- unitType must be one of: case, unit, each, lb`,

  userTemplate: (rawText: string) =>
    `Extract all product line items from the following order guide text.
Return a JSON array of items following the schema exactly.

ORDER GUIDE TEXT:
${rawText}`,
} as const;

export type PromptVersion = typeof ORDER_GUIDE_EXTRACTION_V1;
