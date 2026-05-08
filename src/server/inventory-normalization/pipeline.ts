import type { NormalizationResult, NormalizedInventoryRow } from "~/types/inventory";
import { normalizeName } from "./normalize-name";
import { normalizeBarcode } from "./normalize-barcode";
import { normalizeVendor } from "./normalize-vendor";

/**
 * Run the full normalization pipeline on a raw inventory row.
 * Preserves raw source; never overwrites input data.
 */
export function normalizeInventoryRow(input: {
  rawName: string;
  vendor?: string | null;
  category?: string | null;
  packSize?: string | null;
  unitType?: string | null;
  barcode?: string | null;
}): NormalizationResult {
  const nameResult = normalizeName(input.rawName);
  const vendorResult = normalizeVendor(input.vendor);
  const barcodeResult = normalizeBarcode(input.barcode);

  const unitType = resolveUnitType(input.unitType);
  const packSize = normalizePackSize(input.packSize);

  const flags = [
    ...nameResult.flags,
    ...vendorResult.flags,
    ...barcodeResult.flags,
    ...(unitType.inferred ? (["unit-type-inferred"] as const) : []),
    ...(packSize.normalized ? (["pack-size-normalized"] as const) : []),
  ];

  const nameConfidence = computeNameConfidence(nameResult.normalized, input.rawName);

  const normalized: NormalizedInventoryRow = {
    rawName: input.rawName,
    normalizedName: nameResult.normalized,
    vendor: vendorResult.vendor,
    category: input.category?.trim() ?? undefined,
    packSize: packSize.value,
    unitType: unitType.value,
    barcode: barcodeResult.barcode,
  };

  return {
    normalized,
    confidence: nameConfidence,
    flags,
  };
}

function resolveUnitType(raw: string | null | undefined): {
  value: "case" | "unit";
  inferred: boolean;
} {
  if (!raw?.trim()) return { value: "case", inferred: true };

  const lower = raw.trim().toLowerCase();
  if (["unit", "each", "ea", "pc", "piece"].includes(lower)) {
    return { value: "unit", inferred: false };
  }
  if (["case", "cs", "cse", "ctn", "carton"].includes(lower)) {
    return { value: "case", inferred: false };
  }

  return { value: "case", inferred: true };
}

function normalizePackSize(raw: string | null | undefined): {
  value: string | undefined;
  normalized: boolean;
} {
  if (!raw?.trim()) return { value: undefined, normalized: false };

  // Collapse whitespace and uppercase unit abbreviations
  const cleaned = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d+)\s*(ct|count|pk|pack|oz|lb|lbs|g|gal|ml|l)\b/gi, (_, n: string, u: string) =>
      `${n}${u.toLowerCase()}`,
    );

  return { value: cleaned, normalized: cleaned !== raw.trim() };
}

function computeNameConfidence(normalized: string, raw: string): number {
  if (!normalized || !raw) return 0;

  const lengthRatio = Math.min(normalized.length / Math.max(raw.length, 1), 1);
  const tokenCount = normalized.split(/\s+/).length;

  let score = 0.5;

  // Reward reasonable length
  if (lengthRatio > 0.4 && lengthRatio < 1.5) score += 0.2;

  // Reward multi-token names (more specific)
  if (tokenCount >= 2) score += 0.15;
  if (tokenCount >= 3) score += 0.1;

  // Penalize very short names
  if (normalized.length < 4) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}
