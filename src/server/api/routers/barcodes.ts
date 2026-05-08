import { desc } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { barcodeScans } from "~/server/db/schema";

export const barcodesRouter = createTRPCRouter({
  createScan: publicProcedure
    .input(
      z.object({
        rawValue: z.string().min(1).max(2048),
        symbology: z.string().min(1).max(32).optional(),
        listId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(barcodeScans)
        .values({
          rawValue: input.rawValue,
          symbology: input.symbology,
          source: "camera",
          listId: input.listId,
        })
        .returning();

      return created!;
    }),

  latestScans: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(barcodeScans)
        .orderBy(desc(barcodeScans.createdAt))
        .limit(input.limit);

      return rows;
    }),
});

