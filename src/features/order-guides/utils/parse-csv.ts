import { z } from "zod";

/** Minimal RFC-style CSV parser (quoted fields, commas, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i]!;

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }

  row.push(field);
  const last = row;
  if (last.length > 1 || last[0] !== "") {
    rows.push(last);
  }

  return rows;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const unitTypeSchema = z.enum(["case", "unit"]);

export type ParsedOrderGuideRow = {
  rawName: string;
  normalizedName: string;
  vendor: string | undefined;
  category: string | undefined;
  packSize: string | undefined;
  unitType: "case" | "unit";
  barcode: string | undefined;
};

const NAME_KEYS = new Set([
  "name",
  "item",
  "product",
  "description",
  "item_name",
  "product_name",
]);

const VENDOR_KEYS = new Set(["vendor", "supplier", "mfg", "manufacturer"]);
const CATEGORY_KEYS = new Set(["category", "dept", "department"]);
const PACK_KEYS = new Set(["pack_size", "packsize", "pack", "size"]);
const UNIT_KEYS = new Set(["unit_type", "unittype", "unit", "uom"]);
const BARCODE_KEYS = new Set(["barcode", "upc", "sku", "gtin"]);

function getByKeySet(
  row: string[],
  headerMap: Map<string, string>,
  keys: Set<string>,
): string | undefined {
  for (const k of keys) {
    if (!headerMap.has(k)) continue;
    const v = cellAt(row, headerMap, k);
    if (v) return v;
  }
  return undefined;
}

export function mapHeaders(headers: string[]): Map<string, string> {
  const map = new Map<string, string>();
  headers.forEach((h, idx) => {
    const key = normalizeHeader(h);
    if (key) map.set(key, String(idx));
  });
  return map;
}

function cellAt(row: string[], headerMap: Map<string, string>, key: string) {
  const idxStr = headerMap.get(key);
  if (idxStr === undefined) return "";
  const idx = Number(idxStr);
  if (Number.isNaN(idx)) return "";
  return row[idx]?.trim() ?? "";
}

export function parseOrderGuideRowsFromGrid(grid: string[][]): {
  headers: string[];
  rows: ParsedOrderGuideRow[];
  errors: string[];
} {
  const errors: string[] = [];
  if (grid.length === 0) {
    errors.push("CSV is empty.");
    return { headers: [], rows: [], errors };
  }

  const headerRow = grid[0]!.map((c) => c.trim());
  const headerMap = mapHeaders(headerRow);

  const nameColKey = [...NAME_KEYS].find((k) => headerMap.has(k));
  if (!nameColKey) {
    errors.push(
      'Missing a name column. Use a header like "name", "item", or "product".',
    );
    return { headers: headerRow, rows: [], errors };
  }

  const dataRows = grid.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
  if (dataRows.length === 0) {
    errors.push("No data rows after the header.");
    return { headers: headerRow, rows: [], errors };
  }

  const rows: ParsedOrderGuideRow[] = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;
    const rawName = cellAt(row, headerMap, nameColKey);
    if (!rawName) {
      errors.push(`Row ${i + 2}: missing name.`);
      continue;
    }

    const vendor = getByKeySet(row, headerMap, VENDOR_KEYS);
    const category = getByKeySet(row, headerMap, CATEGORY_KEYS);
    const packKey = [...PACK_KEYS].find((k) => headerMap.has(k));
    const packSize = packKey ? cellAt(row, headerMap, packKey) : undefined;
    const unitKey = [...UNIT_KEYS].find((k) => headerMap.has(k));
    const rawUnit = unitKey ? cellAt(row, headerMap, unitKey).toLowerCase() : "";
    let unitType: "case" | "unit" = "case";
    if (rawUnit === "unit" || rawUnit === "each" || rawUnit === "ea") {
      unitType = "unit";
    } else if (rawUnit === "case" || rawUnit === "cs" || rawUnit === "") {
      unitType = "case";
    } else {
      const parsed = unitTypeSchema.safeParse(rawUnit);
      if (parsed.success) unitType = parsed.data;
      else errors.push(`Row ${i + 2}: unknown unit_type "${rawUnit}", using case.`);
    }

    const barcodeKey = [...BARCODE_KEYS].find((k) => headerMap.has(k));
    const barcodeRaw = barcodeKey ? cellAt(row, headerMap, barcodeKey) : "";
    const barcode = barcodeRaw !== "" ? barcodeRaw : undefined;

    const normalizedName = rawName.replace(/\s+/g, " ").trim();

    rows.push({
      rawName,
      normalizedName,
      vendor: vendor ?? undefined,
      category: category ?? undefined,
      packSize: packSize !== "" ? packSize : undefined,
      unitType,
      barcode,
    });
  }

  return { headers: headerRow, rows, errors };
}

export function parseOrderGuideFromCsvText(csvText: string) {
  const grid = parseCsv(csvText.trim());
  return parseOrderGuideRowsFromGrid(grid);
}
