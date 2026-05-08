import { ilike, or, eq, sql, desc } from "drizzle-orm";
import type { DbTransaction } from "~/server/db";
import { db as defaultDb } from "~/server/db";
import { catalogItems } from "~/server/db/schema";
import type { CatalogSearchResult } from "~/types/inventory";

type Db = typeof defaultDb | DbTransaction;

/**
 * Ranked catalog search.
 *
 * Priority order:
 *   1. Exact barcode match         (score 100) — instant for scanner workflows
 *   2. Exact name match (case-ins) (score 90)
 *   3. Name starts-with query      (score 70)
 *   4. Vendor/category starts-with (score 50)
 *   5. Any field contains query    (score 30)
 *
 * TODO: enable pg_trgm extension and replace with similarity() for typo tolerance.
 *       Migration: CREATE EXTENSION IF NOT EXISTS pg_trgm;
 *       Index:     CREATE INDEX ON smartorder_catalog_item USING gin(name gin_trgm_ops);
 */
export async function searchCatalog(
  query: string,
  options: { limit?: number; db?: Db } = {},
): Promise<CatalogSearchResult[]> {
  const { limit = 24, db: dbCtx = defaultDb } = options;

  const q = query.trim();

  if (!q) {
    const rows = await (dbCtx as typeof defaultDb)
      .select()
      .from(catalogItems)
      .orderBy(desc(catalogItems.updatedAt), desc(catalogItems.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, unitType: r.unitType as CatalogSearchResult["unitType"] }));
  }

  const lower = q.toLowerCase();
  const containsPattern = `%${q}%`;

  // Use a scored query via CASE expression so Postgres does one pass
  const rows = await (dbCtx as typeof defaultDb)
    .select({
      id: catalogItems.id,
      name: catalogItems.name,
      vendor: catalogItems.vendor,
      category: catalogItems.category,
      packSize: catalogItems.packSize,
      unitType: catalogItems.unitType,
      barcode: catalogItems.barcode,
      createdAt: catalogItems.createdAt,
      updatedAt: catalogItems.updatedAt,
      score: sql<number>`
        case
          when lower(${catalogItems.barcode}) = ${lower}                    then 100
          when lower(${catalogItems.name})    = ${lower}                    then 90
          when lower(${catalogItems.name})    like ${lower + "%"}           then 70
          when lower(${catalogItems.vendor})  like ${lower + "%"}           then 50
          when lower(${catalogItems.category}) like ${lower + "%"}          then 50
          when lower(${catalogItems.name})    like ${"%" + lower + "%"}     then 30
          when lower(${catalogItems.vendor})  like ${"%" + lower + "%"}     then 20
          when lower(${catalogItems.category}) like ${"%" + lower + "%"}    then 20
          when lower(${catalogItems.barcode}) like ${"%" + lower + "%"}     then 10
          else 0
        end
      `.as("score"),
    })
    .from(catalogItems)
    .where(
      or(
        eq(catalogItems.barcode, q),
        ilike(catalogItems.name, containsPattern),
        ilike(catalogItems.vendor, containsPattern),
        ilike(catalogItems.category, containsPattern),
        ilike(catalogItems.barcode, containsPattern),
      ),
    )
    .orderBy(sql`score desc`, desc(catalogItems.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    vendor: r.vendor,
    category: r.category,
    packSize: r.packSize,
    unitType: r.unitType as CatalogSearchResult["unitType"],
    barcode: r.barcode,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    score: r.score,
    matchedField: resolveMatchedField(r, lower),
  }));
}

function resolveMatchedField(
  row: { name: string; vendor: string | null; category: string | null; barcode: string | null },
  lower: string,
): CatalogSearchResult["matchedField"] {
  const q = lower;
  if (row.barcode?.toLowerCase().includes(q)) return "barcode";
  if (row.name.toLowerCase().includes(q)) return "name";
  if (row.vendor?.toLowerCase().includes(q)) return "vendor";
  if (row.category?.toLowerCase().includes(q)) return "category";
  return "name";
}
