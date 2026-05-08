import { catalogRouter } from "~/server/api/routers/catalog";
import { barcodesRouter } from "~/server/api/routers/barcodes";
import { listsRouter } from "~/server/api/routers/lists";
import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  barcodes: barcodesRouter,
  catalog: catalogRouter,
  lists: listsRouter,
  post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
