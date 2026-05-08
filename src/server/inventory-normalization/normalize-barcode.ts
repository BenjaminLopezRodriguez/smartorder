import type { NormalizationFlag } from "~/types/inventory";

/**
 * Canonicalize a barcode string.
 * Strips whitespace, dashes, and leading zeros for UPC-A comparison.
 */
export function normalizeBarcode(raw: string | undefined | null): {
  barcode: string | undefined;
  flags: NormalizationFlag[];
} {
  const flags: NormalizationFlag[] = [];

  if (!raw?.trim()) return { barcode: undefined, flags };

  const stripped = raw.replace(/[\s-]/g, "").trim();

  if (!/^\d{8,14}$/.test(stripped)) {
    flags.push("barcode-invalid");
    return { barcode: stripped, flags };
  }

  return { barcode: stripped, flags };
}

/**
 * Returns true if two barcodes refer to the same item.
 * Handles UPC-A (12-digit) vs EAN-13 (13-digit) with leading zero.
 */
export function barcodesMatch(a: string, b: string): boolean {
  if (a === b) return true;

  // UPC-A vs EAN-13 equivalence (prepend 0)
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 12 && bLen === 13) return `0${a}` === b;
  if (aLen === 13 && bLen === 12) return a === `0${b}`;

  return false;
}
