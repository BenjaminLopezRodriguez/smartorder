import { z } from "zod";
import { desc, ilike, or } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { catalogItems } from "~/server/db/schema";

export const catalogRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        query: z.string().default(""),
        limit: z.number().int().min(1).max(50).default(24),
      }),
    )
    .query(async ({ ctx, input }) => {
      const q = input.query.trim();
      if (!q) {
        return await ctx.db
          .select()
          .from(catalogItems)
          .orderBy(desc(catalogItems.createdAt))
          .limit(input.limit);
      }

      const pattern = `%${q}%`;
      return await ctx.db
        .select()
        .from(catalogItems)
        .where(
          or(
            ilike(catalogItems.name, pattern),
            ilike(catalogItems.vendor, pattern),
            ilike(catalogItems.category, pattern),
            ilike(catalogItems.barcode, pattern),
          ),
        )
        .orderBy(desc(catalogItems.createdAt))
        .limit(input.limit);
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

