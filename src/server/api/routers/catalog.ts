import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { catalogItems } from "~/server/db/schema";
import { searchCatalog } from "~/server/catalog-search";

export const catalogRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        query: z.string().default(""),
        limit: z.number().int().min(1).max(50).default(24),
      }),
    )
    .query(async ({ ctx, input }) => {
      return searchCatalog(input.query, { limit: input.limit, db: ctx.db });
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        vendor: z.string().max(256).optional(),
        category: z.string().max(128).optional(),
        packSize: z.string().max(64).optional(),
        unitType: z.enum(["case", "unit"]).default("case"),
        barcode: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(catalogItems)
        .values({
          name: input.name,
          vendor: input.vendor,
          category: input.category,
          packSize: input.packSize,
          unitType: input.unitType,
          barcode: input.barcode,
        })
        .returning();

      return created!;
    }),
});
