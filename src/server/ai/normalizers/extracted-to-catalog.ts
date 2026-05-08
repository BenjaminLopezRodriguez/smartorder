import type { ExtractedCatalogItem } from "../schemas/ocr";
import type { NormalizedInventoryRow } from "~/types/inventory";
import { normalizeInventoryRow } from "~/server/inventory-normalization";

/**
 * Convert a validated AI extraction result into a normalized inventory row
 * ready for database persistence.
 */
export function extractedToCatalogRow(item: ExtractedCatalogItem): {
  normalized: NormalizedInventoryRow;
  confidence: number;
} {
  const normResult = normalizeInventoryRow({
    rawName: item.ocrSource,
    vendor: item.vendor?.value ?? null,
    category: item.category?.value ?? null,
    packSize: item.packSize?.value ?? null,
    unitType: item.unitType?.value ?? null,
    barcode: item.barcode?.value ?? null,
  });

  // Blend AI confidence with normalization confidence
  const blended = (item.confidence + normResult.confidence) / 2;

  return {
    normalized: {
      ...normResult.normalized,
      normalizedName: item.name.value || normResult.normalized.normalizedName,
    },
    confidence: blended,
  };
}
