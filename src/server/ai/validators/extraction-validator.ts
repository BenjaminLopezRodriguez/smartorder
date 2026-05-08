import {
  extractedCatalogItemSchema,
  type ExtractedCatalogItem,
  CONFIDENCE_THRESHOLD,
} from "../schemas/ocr";

export type ValidationResult = {
  valid: ExtractedCatalogItem[];
  lowConfidence: ExtractedCatalogItem[];
  rejected: Array<{ raw: unknown; reason: string }>;
};

/**
 * Validate and partition AI extraction output.
 * Never throws — returns a structured result with rejected items for review.
 */
export function validateExtractionOutput(raw: unknown[]): ValidationResult {
  const valid: ExtractedCatalogItem[] = [];
  const lowConfidence: ExtractedCatalogItem[] = [];
  const rejected: ValidationResult["rejected"] = [];

  for (const item of raw) {
    const result = extractedCatalogItemSchema.safeParse(item);

    if (!result.success) {
      rejected.push({
        raw: item,
        reason: result.error.issues.map((i) => i.message).join("; "),
      });
      continue;
    }

    const parsed = result.data;

    if (!parsed.name.value.trim()) {
      rejected.push({ raw: item, reason: "Empty name after parsing" });
      continue;
    }

    if (parsed.confidence < CONFIDENCE_THRESHOLD) {
      lowConfidence.push(parsed);
    } else {
      valid.push(parsed);
    }
  }

  return { valid, lowConfidence, rejected };
}
