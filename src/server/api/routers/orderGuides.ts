import { put } from "@vercel/blob";
import { z } from "zod";
import { and, asc, desc, eq, ilike } from "drizzle-orm";

import { parseOrderGuideFromCsvText } from "~/lib/order-guide-csv";
import { env } from "~/env";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import type { DbTransaction } from "~/server/db";
import {
  catalogItems,
  listItems,
  lists,
  orderGuideItems,
  orderGuides,
} from "~/server/db/schema";

const sourceTypeSchema = z.enum(["csv", "pdf", "image"]);

function guessContentType(
  filename: string,
  sourceType: "pdf" | "image",
): string {
  const lower = filename.toLowerCase();
  if (sourceType === "pdf") return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

async function resolveCatalogItemId(
  tx: DbTransaction,
  row: {
    normalizedName: string;
    vendor?: string | null;
    category?: string | null;
    packSize?: string | null;
    unitType: string;
    barcode?: string | null;
  },
  syncCatalog: boolean,
): Promise<string | null> {
  if (!syncCatalog) return null;

  if (row.barcode?.trim()) {
    const byBarcode = await tx
      .select({ id: catalogItems.id })
      .from(catalogItems)
      .where(eq(catalogItems.barcode, row.barcode.trim()))
      .limit(1);
    if (byBarcode[0]) return byBarcode[0].id;
  }

  const nameCond = ilike(catalogItems.name, row.normalizedName);
  const whereVendor = row.vendor?.trim()
    ? and(nameCond, ilike(catalogItems.vendor, row.vendor.trim()))
    : nameCond;

  const byName = await tx
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(whereVendor)
    .limit(1);

  if (byName[0]) return byName[0].id;

  const [created] = await tx
    .insert(catalogItems)
    .values({
      name: row.normalizedName.slice(0, 256),
      vendor: row.vendor?.trim() ? row.vendor.trim().slice(0, 256) : undefined,
      category: row.category?.trim()
        ? row.category.trim().slice(0, 128)
        : undefined,
      packSize: row.packSize?.trim()
        ? row.packSize.trim().slice(0, 64)
        : undefined,
      unitType: row.unitType === "unit" ? "unit" : "case",
      barcode: row.barcode?.trim()
        ? row.barcode.trim().slice(0, 64)
        : undefined,
    })
    .returning({ id: catalogItems.id });

  return created?.id ?? null;
}

export const orderGuidesRouter = createTRPCRouter({
  storageStatus: publicProcedure.query(() => ({
    blobConfigured: Boolean(env.BLOB_READ_WRITE_TOKEN?.trim()),
  })),

  createFromCsv: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        vendor: z.string().max(256).optional(),
        csvText: z.string().min(1).max(2_000_000),
        syncCatalog: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const parsed = parseOrderGuideFromCsvText(input.csvText);
      if (parsed.errors.length && parsed.rows.length === 0) {
        return {
          ok: false as const,
          errors: parsed.errors,
          guideId: null as string | null,
        };
      }

      const result = await ctx.db.transaction(async (tx) => {
        const [guide] = await tx
          .insert(orderGuides)
          .values({
            name: input.name,
            vendor: input.vendor,
            sourceType: "csv",
            fileUrl: null,
          })
          .returning();

        if (!guide) throw new Error("Failed to create order guide");

        let sortOrder = 0;
        for (const r of parsed.rows) {
          const catalogItemId = await resolveCatalogItemId(
            tx,
            {
              normalizedName: r.normalizedName,
              vendor: r.vendor,
              category: r.category,
              packSize: r.packSize,
              unitType: r.unitType,
              barcode: r.barcode,
            },
            input.syncCatalog,
          );

          await tx.insert(orderGuideItems).values({
            orderGuideId: guide.id,
            rawName: r.rawName.slice(0, 512),
            normalizedName: r.normalizedName.slice(0, 512),
            vendor: r.vendor?.slice(0, 256),
            category: r.category?.slice(0, 128),
            packSize: r.packSize?.slice(0, 64),
            unitType: r.unitType,
            barcode: r.barcode?.slice(0, 64),
            sortOrder,
            catalogItemId,
          });
          sortOrder += 1;
        }

        return { guide, rowCount: parsed.rows.length };
      });

      return {
        ok: true as const,
        guideId: result.guide.id,
        itemCount: result.rowCount,
        warnings: parsed.errors,
      };
    }),

  createFromArtifact: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        vendor: z.string().max(256).optional(),
        sourceType: z.enum(["pdf", "image"]),
        filename: z.string().min(1).max(512),
        /** Base64-encoded file bytes (no data: URL prefix). */
        contentBase64: z.string().min(1).max(30_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const token = env.BLOB_READ_WRITE_TOKEN?.trim();
      if (!token) {
        return {
          ok: false as const,
          error:
            "File storage is not configured. Add BLOB_READ_WRITE_TOKEN to enable PDF or image uploads.",
        };
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(input.contentBase64, "base64");
      } catch {
        return { ok: false as const, error: "Invalid file encoding." };
      }

      if (buffer.length === 0) {
        return { ok: false as const, error: "Empty file." };
      }
      if (buffer.length > 12 * 1024 * 1024) {
        return { ok: false as const, error: "File is too large (max 12 MB)." };
      }

      const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const pathname = `order-guides/${crypto.randomUUID()}/${safeName}`;

      const blob = await put(pathname, buffer, {
        access: "public",
        token,
        contentType: guessContentType(input.filename, input.sourceType),
      });

      const [guide] = await ctx.db
        .insert(orderGuides)
        .values({
          name: input.name,
          vendor: input.vendor,
          sourceType: input.sourceType,
          fileUrl: blob.url,
        })
        .returning();

      if (!guide) throw new Error("Failed to create order guide");

      return { ok: true as const, guideId: guide.id, fileUrl: blob.url };
    }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({
          id: orderGuides.id,
          name: orderGuides.name,
          vendor: orderGuides.vendor,
          sourceType: orderGuides.sourceType,
          fileUrl: orderGuides.fileUrl,
          createdAt: orderGuides.createdAt,
        })
        .from(orderGuides)
        .orderBy(desc(orderGuides.createdAt))
        .limit(input.limit);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [guide] = await ctx.db
        .select()
        .from(orderGuides)
        .where(eq(orderGuides.id, input.id))
        .limit(1);

      if (!guide) return null;

      const items = await ctx.db
        .select()
        .from(orderGuideItems)
        .where(eq(orderGuideItems.orderGuideId, input.id))
        .orderBy(asc(orderGuideItems.sortOrder), asc(orderGuideItems.createdAt));

      return {
        ...guide,
        sourceType: sourceTypeSchema.catch("csv").parse(guide.sourceType),
        items,
      };
    }),

  createListFromGuide: publicProcedure
    .input(
      z.object({
        orderGuideId: z.string().uuid(),
        listName: z.string().min(1).max(256),
        syncCatalog: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const guideRows = await tx
          .select()
          .from(orderGuideItems)
          .where(eq(orderGuideItems.orderGuideId, input.orderGuideId))
          .orderBy(asc(orderGuideItems.sortOrder), asc(orderGuideItems.createdAt));

        if (guideRows.length === 0) {
          return { ok: false as const, error: "This guide has no line items." };
        }

        const [list] = await tx
          .insert(lists)
          .values({ name: input.listName, status: "draft" })
          .returning();

        if (!list) throw new Error("Failed to create list");

        for (const row of guideRows) {
          let catalogId = row.catalogItemId;
          if (!catalogId && input.syncCatalog) {
            catalogId = await resolveCatalogItemId(
              tx,
              {
                normalizedName: row.normalizedName ?? row.rawName,
                vendor: row.vendor,
                category: row.category,
                packSize: row.packSize,
                unitType: row.unitType,
                barcode: row.barcode,
              },
              true,
            );
          }

          if (!catalogId) {
            return {
              ok: false as const,
              error:
                "Some rows are not linked to the catalog. Re-import with catalog sync enabled or add catalog links.",
            };
          }

          const targetCases = row.unitType === "unit" ? 0 : 1;
          const targetUnits = row.unitType === "unit" ? 1 : 0;

          await tx.insert(listItems).values({
            listId: list.id,
            catalogItemId: catalogId,
            targetCases,
            targetUnits,
            sortOrder: row.sortOrder,
          });

          if (!row.catalogItemId && catalogId) {
            await tx
              .update(orderGuideItems)
              .set({ catalogItemId: catalogId })
              .where(eq(orderGuideItems.id, row.id));
          }
        }

        return { ok: true as const, listId: list.id };
      });

      return result;
    }),
});
