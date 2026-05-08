import type { NormalizationFlag } from "~/types/inventory";

const NOISE_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "for", "with",
]);

const UNIT_ALIASES: Record<string, string> = {
  "pk": "pack",
  "pkg": "pack",
  "ct": "count",
  "oz": "oz",
  "lb": "lb",
  "lbs": "lb",
  "ea": "each",
};

const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  "whl": "whole",
  "slcd": "sliced",
  "slc": "sliced",
  "chkn": "chicken",
  "bnls": "boneless",
  "grnd": "ground",
  "frzn": "frozen",
  "asst": "assorted",
  "choc": "chocolate",
  "strwb": "strawberry",
  "van": "vanilla",
  "chz": "cheese",
  "tom": "tomato",
};

function expandAbbreviations(token: string): string {
  return ABBREVIATION_EXPANSIONS[token.toLowerCase()] ?? token;
}

function normalizeUnit(token: string): string {
  return UNIT_ALIASES[token.toLowerCase()] ?? token;
}

/**
 * Canonicalize a product name from raw OCR or CSV text.
 * Returns the normalized name and any flags raised during normalization.
 */
export function normalizeName(raw: string): {
  normalized: string;
  flags: NormalizationFlag[];
} {
  const flags: NormalizationFlag[] = [];

  let text = raw.trim();

  // Collapse whitespace
  text = text.replace(/\s+/g, " ");

  // Lowercase for processing
  const tokens = text.split(" ").map((t) => {
    const lower = t.toLowerCase().replace(/[^a-z0-9#&'/-]/g, "");
    const expanded = expandAbbreviations(lower);
    const unitNorm = normalizeUnit(expanded);
    return unitNorm;
  });

  // Remove pure noise words from middle (keep first/last)
  const filtered =
    tokens.length <= 2
      ? tokens
      : tokens.filter((t, i) => {
          if (i === 0 || i === tokens.length - 1) return true;
          return !NOISE_WORDS.has(t);
        });

  if (filtered.length === 0) {
    flags.push("low-confidence-name");
    return { normalized: raw.trim(), flags };
  }

  // Title-case final output
  const normalized = filtered
    .map((t) => (t.length > 0 ? t[0]!.toUpperCase() + t.slice(1) : t))
    .join(" ");

  if (normalized.length < 3) {
    flags.push("low-confidence-name");
  }

  return { normalized, flags };
}

/**
 * Compute a similarity score (0–1) between two normalized names.
 * Uses token overlap for warehouse-friendly fuzzy matching.
 */
export function nameSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/));
  const tokensB = new Set(b.toLowerCase().split(/\s+/));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  return (2 * overlap) / (tokensA.size + tokensB.size);
}
