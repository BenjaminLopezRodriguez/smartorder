import type { NormalizationFlag } from "~/types/inventory";

// Common vendor aliases — expand as needed
const VENDOR_ALIASES: Record<string, string> = {
  "bimbo bakeries": "Bimbo",
  "bimbo bakeries usa": "Bimbo",
  "frito-lay": "Frito Lay",
  "fritolay": "Frito Lay",
  "frito lay north america": "Frito Lay",
  "general mills sales": "General Mills",
  "general mills inc": "General Mills",
  "pepsi-cola": "PepsiCo",
  "pepsico": "PepsiCo",
  "pepsi co": "PepsiCo",
  "coca-cola": "Coca-Cola",
  "the coca cola company": "Coca-Cola",
  "kellogg sales": "Kellogg's",
  "kellogg company": "Kellogg's",
  "kelloggs": "Kellogg's",
  "campbell soup": "Campbell's",
  "campbells": "Campbell's",
  "kraft heinz": "Kraft Heinz",
  "kraft foods": "Kraft Heinz",
};

const LEGAL_SUFFIXES = /\s+(inc|llc|ltd|corp|co|company|sales|usa|north america)\.?$/i;

function stripLegalSuffix(name: string): string {
  return name.replace(LEGAL_SUFFIXES, "").trim();
}

/**
 * Normalize a vendor name: strip legal suffixes, resolve known aliases.
 */
export function normalizeVendor(raw: string | undefined | null): {
  vendor: string | undefined;
  flags: NormalizationFlag[];
} {
  const flags: NormalizationFlag[] = [];

  if (!raw?.trim()) return { vendor: undefined, flags };

  const stripped = stripLegalSuffix(raw.trim());
  const key = stripped.toLowerCase().replace(/[^a-z0-9 -]/g, "").trim();

  if (VENDOR_ALIASES[key]) {
    flags.push("vendor-alias-resolved");
    return { vendor: VENDOR_ALIASES[key], flags };
  }

  // Title-case the result
  const titled = stripped
    .split(/\s+/)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  return { vendor: titled, flags };
}

/**
 * Return true if two vendor strings likely refer to the same supplier.
 */
export function vendorsMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(LEGAL_SUFFIXES, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  return normalize(a) === normalize(b);
}
