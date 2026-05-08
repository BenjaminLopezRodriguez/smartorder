// AI pipeline public API
export { validateExtractionOutput } from "./validators/extraction-validator";
export { extractedToCatalogRow } from "./normalizers/extracted-to-catalog";
export { ORDER_GUIDE_EXTRACTION_V1 } from "./prompts/order-guide-extraction";
export {
  extractedCatalogItemSchema,
  ocrExtractionResultSchema,
  CONFIDENCE_THRESHOLD,
  isLowConfidence,
} from "./schemas/ocr";
export type {
  ExtractedCatalogItem,
  ExtractedValue,
  OcrExtractionResult,
} from "./schemas/ocr";
