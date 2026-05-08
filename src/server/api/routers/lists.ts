import { z } from "zod";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { catalogItems, listItems, lists } from "~/server/db/schema";
import { searchCatalog } from "~/server/catalog-search";

const listStatusSchema = z.enum(["draft", "scanning", "review", "complete"]);

export const listsRouter = createTRPCRouter({
  all: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(24),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: lists.id,
          name: lists.name,
          status: lists.status,
          updatedAt: lists.updatedAt,
          createdAt: lists.createdAt,
          itemCount: count(listItems.id),
          scannedCases: count(listItems.id), // placeholder; computed below
        })
        .from(lists)
        .leftJoin(listItems, eq(listItems.listId, lists.id))
        .groupBy(lists.id)
        .orderBy(desc(lists.updatedAt), desc(lists.createdAt))
        .limit(input.limit);

      // We keep the "summary" shape simple for now; UI can compute progress from list detail.
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: listStatusSchema.catch("draft").parse(r.status),
        updatedAt: r.updatedAt ?? r.createdAt,
        itemCount: Number(r.itemCount ?? 0),
      }));
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(lists)
        .values({ name: input.name, status: "draft" })
        .returning();
      return created!;
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [list] = await ctx.db
        .select()
        .from(lists)
        .where(eq(lists.id, input.id))
        .limit(1);

      if (!list) return null;

      const items = await ctx.db
        .select({
          id: listItems.id,
          listId: listItems.listId,
          catalogItemId: listItems.catalogItemId,
          targetCases: listItems.targetCases,
          targetUnits: listItems.targetUnits,
          scannedCases: listItems.scannedCases,
          scannedUnits: listItems.scannedUnits,
          sortOrder: listItems.sortOrder,
          name: catalogItems.name,
          vendor: catalogItems.vendor,
          category: catalogItems.category,
          packSize: catalogItems.packSize,
          unitType: catalogItems.unitType,
          barcode: catalogItems.barcode,
        })
        .from(listItems)
        .innerJoin(catalogItems, eq(catalogItems.id, listItems.catalogItemId))
        .where(eq(listItems.listId, input.id))
        .orderBy(asc(listItems.sortOrder), asc(listItems.createdAt));

      return {
        ...list,
        status: listStatusSchema.catch("draft").parse(list.status),
        items,
      };
    }),

  addItem: publicProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        catalogItemId: z.string().uuid(),
        targetCases: z.number().int().min(0).max(999).default(0),
        targetUnits: z.number().int().min(0).max(999).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Avoid duplicates: if already exists, just update targets (idempotent add).
      const existing = await ctx.db
        .select({ id: listItems.id, sortOrder: listItems.sortOrder })
        .from(listItems)
        .where(
          and(
            eq(listItems.listId, input.listId),
            eq(listItems.catalogItemId, input.catalogItemId),
          ),
        )
        .limit(1);

      if (existing[0]) {
        const [updated] = await ctx.db
          .update(listItems)
          .set({
            targetCases: input.targetCases,
            targetUnits: input.targetUnits,
          })
          .where(eq(listItems.id, existing[0].id))
          .returning();
        return updated!;
      }

      const maxSort = await ctx.db
        .select({ max: listItems.sortOrder })
        .from(listItems)
        .where(eq(listItems.listId, input.listId))
        .orderBy(desc(listItems.sortOrder))
        .limit(1);

      const nextSort = (maxSort[0]?.max ?? 0) + 1;
      const [created] = await ctx.db
        .insert(listItems)
        .values({
          listId: input.listId,
          catalogItemId: input.catalogItemId,
          targetCases: input.targetCases,
          targetUnits: input.targetUnits,
          sortOrder: nextSort,
        })
        .returning();
      return created!;
    }),

  updateScanCounts: publicProcedure
    .input(
      z.object({
        listItemId: z.string().uuid(),
        scannedCases: z.number().int().min(0).max(999),
        scannedUnits: z.number().int().min(0).max(999),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(listItems)
        .set({
          scannedCases: input.scannedCases,
          scannedUnits: input.scannedUnits,
        })
        .where(eq(listItems.id, input.listItemId))
        .returning();
      return updated ?? null;
    }),

  setStatus: publicProcedure
    .input(z.object({ listId: z.string().uuid(), status: listStatusSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(lists)
        .set({ status: input.status })
        .where(eq(lists.id, input.listId))
        .returning();
      return updated ?? null;
    }),

  stats: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        totalItems: count(listItems.id),
        scannedItems: sql<number>`cast(sum(case when ${listItems.scannedCases} + ${listItems.scannedUnits} > 0 then 1 else 0 end) as int)`,
      })
      .from(lists)
      .leftJoin(listItems, eq(listItems.listId, lists.id))
      .where(sql`${lists.status} != 'complete'`);

    const row = rows[0];
    const totalItems = Number(row?.totalItems ?? 0);
    const scannedItems = Number(row?.scannedItems ?? 0);
    return {
      itemsInList: totalItems,
      scanned: scannedItems,
      remaining: totalItems - scannedItems,
    };
  }),

  catalogSearchForAdd: publicProcedure
    .input(
      z.object({
        query: z.string().default(""),
        limit: z.number().int().min(1).max(50).default(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      return searchCatalog(input.query, { limit: input.limit, db: ctx.db });
    }),
});

