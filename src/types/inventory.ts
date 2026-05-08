/**
 * Canonical inventory type system.
 * All features (OCR, search, scan, catalog, AI, BackroomVision) reference these types.
 * Do not duplicate these definitions elsewhere.
 */

// ---------------------------------------------------------------------------
// Unit types
// ---------------------------------------------------------------------------

export const UNIT_TYPES = ["case", "unit", "each", "lb"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const LIST_STATUSES = ["draft", "scanning", "review", "complete"] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export const ORDER_GUIDE_SOURCE_TYPES = ["csv", "pdf", "image"] as const;
export type OrderGuideSourceType = (typeof ORDER_GUIDE_SOURCE_TYPES)[number];

export const BARCODE_SOURCES = ["camera", "manual", "import"] as const;
export type BarcodeSource = (typeof BARCODE_SOURCES)[number];

// ---------------------------------------------------------------------------
// Core inventory entity
// ---------------------------------------------------------------------------

export type CatalogItem = {
  id: string;
  name: string;
  vendor: string | null;
  category: string | null;
  packSize: string | null;
  unitType: UnitType;
  barcode: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

// ---------------------------------------------------------------------------
// List entities
// ---------------------------------------------------------------------------

export type List = {
  id: string;
  name: string;
  status: ListStatus;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ListItem = {
  id: string;
  listId: string;
  catalogItemId: string;
  targetCases: number;
  targetUnits: number;
  scannedCases: number;
  scannedUnits: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date | null;
};

export type ListItemWithCatalog = ListItem & Pick<CatalogItem, "name" | "vendor" | "category" | "packSize" | "unitType" | "barcode">;

export type ListWithItems = List & { items: ListItemWithCatalog[] };

// ---------------------------------------------------------------------------
// Order guide entities
// ---------------------------------------------------------------------------

export type OrderGuide = {
  id: string;
  name: string;
  vendor: string | null;
  sourceType: OrderGuideSourceType;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

export type OrderGuideItem = {
  id: string;
  orderGuideId: string;
  rawName: string;
  normalizedName: string | null;
  vendor: string | null;
  category: string | null;
  packSize: string | null;
  unitType: string;
  barcode: string | null;
  sortOrder: number;
  catalogItemId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
};

// ---------------------------------------------------------------------------
// OCR extraction — every extracted value carries provenance
// ---------------------------------------------------------------------------

export type ExtractedValue<T = string> = {
  value: T;
  confidence: number; // 0–1
  sourcePage?: number;
  sourceLine?: number;
  extractionMethod?: "ocr" | "ai-parse" | "csv" | "manual";
};

export type ExtractedCatalogItem = {
  name: ExtractedValue;
  vendor: ExtractedValue | null;
  category: ExtractedValue | null;
  packSize: ExtractedValue | null;
  unitType: ExtractedValue<UnitType>;
  barcode: ExtractedValue | null;
  ocrSource: string;
  confidence: number;
};

// ---------------------------------------------------------------------------
// Normalization pipeline types
// ---------------------------------------------------------------------------

export type NormalizedInventoryRow = {
  rawName: string;
  normalizedName: string;
  vendor: string | undefined;
  category: string | undefined;
  packSize: string | undefined;
  unitType: "case" | "unit";
  barcode: string | undefined;
};

export type NormalizationResult = {
  normalized: NormalizedInventoryRow;
  confidence: number;
  flags: NormalizationFlag[];
};

export type NormalizationFlag =
  | "duplicate-suspected"
  | "low-confidence-name"
  | "barcode-invalid"
  | "unit-type-inferred"
  | "vendor-alias-resolved"
  | "pack-size-normalized";

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type CatalogSearchResult = CatalogItem & {
  score?: number;
  matchedField?: "name" | "vendor" | "category" | "barcode";
};

// ---------------------------------------------------------------------------
// Backroom
// ---------------------------------------------------------------------------

export type BackroomSnapshot = {
  id: string;
  location: string;
  imageUrl: string;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Scan session
// ---------------------------------------------------------------------------

export type ScanSessionItem = ListItemWithCatalog & {
  isComplete: boolean;
  delta: number;
};

export type ScanSessionStats = {
  totalItems: number;
  scannedItems: number;
  remainingItems: number;
  completionPercent: number;
};
