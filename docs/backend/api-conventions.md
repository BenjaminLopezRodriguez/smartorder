# SmartOrder — Backend API Conventions (tRPC)

## Purpose

Defines the canonical patterns for all tRPC procedures in SmartOrder. All AI agents and engineers must follow these conventions when adding, modifying, or reviewing API code. Consistency in the API layer directly affects type safety, error handling quality, and the predictability of the codebase.

---

## Responsibilities

- Define the tRPC procedure authoring standard
- Establish input validation rules (Zod)
- Define error handling patterns
- Specify mutation return conventions
- Document router organization

---

## Router Organization

```
src/server/api/
  root.ts          ← assembles all routers; read before adding a new router
  trpc.ts          ← createTRPCRouter, protectedProcedure, publicProcedure
  routers/
    catalog.ts     ← catalogItems CRUD + search
    lists.ts       ← lists + listItems CRUD + scan tracking
    backroom.ts    ← backroomSnapshots + vision analysis
    ocr.ts         ← OCR job management (planned)
    post.ts        ← scaffold; remove when no longer needed
```

### Adding a new router

1. Create `src/server/api/routers/[domain].ts`
2. Import and register it in `src/server/api/root.ts`
3. Document the domain in this file

Never put unrelated procedures in the same router. One domain = one file.

---

## Procedure Types

| Type | When to use |
|---|---|
| `protectedProcedure` | All app operations (requires auth context) |
| `publicProcedure` | Public endpoints only (health check, public catalog browse if implemented) |

Default to `protectedProcedure`. Only use `publicProcedure` with explicit justification.

---

## Input Validation (Zod — Required)

Every procedure must validate input with Zod. No exceptions.

```typescript
// Required for all procedures
.input(z.object({
  id: z.string().uuid(),           // UUIDs must be validated as UUIDs
  name: z.string().min(1).max(256), // string lengths must be bounded
  status: z.enum(["draft", "active", "complete"]), // enums must be exhaustive
  limit: z.number().int().min(1).max(100).default(50),  // pagination bounded
  offset: z.number().int().min(0).default(0),
}))
```

### Common Zod patterns

```typescript
// Optional fields with defaults
vendor: z.string().max(256).optional(),
// → returns string | undefined; use .nullable() if DB field is nullable

// Date fields
targetDate: z.string().datetime().optional(),

// Pagination
const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

// Reusable schemas
const UUIDSchema = z.string().uuid();
const ItemStatusSchema = z.enum(["draft", "active", "complete"]);
```

---

## Return Conventions

### Queries

Return typed objects. Never return raw Drizzle results as-is if the shape might change.

```typescript
// OK for simple selects
return db.select().from(catalogItems).where(...);

// Better for complex queries: define a return type
type CatalogItemWithCount = typeof catalogItems.$inferSelect & {
  listCount: number;
};
```

### Mutations: always return the affected record

```typescript
// ✅ Correct: return the created/updated record
const [item] = await db
  .insert(catalogItems)
  .values(input)
  .returning();
return item; // the client gets the final DB state

// ❌ Wrong: return void or generic success
return { success: true };
return;
```

### Paginated queries

Always return both data and total count:

```typescript
return {
  items: results,
  total: totalCount,
  hasMore: offset + results.length < totalCount,
};
```

---

## Error Handling

Use `TRPCError` for all expected errors:

```typescript
import { TRPCError } from "@trpc/server";

// Record not found
throw new TRPCError({
  code: "NOT_FOUND",
  message: `List ${input.id} not found`,
});

// Business rule violation
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Cannot modify a completed list",
});

// Auth error (usually handled by middleware, but explicit when needed)
throw new TRPCError({
  code: "UNAUTHORIZED",
  message: "Must be authenticated to access this resource",
});

// Unexpected DB/service error
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "Failed to save changes",
  cause: originalError, // pass original for logging
});
```

### TRPC error codes reference

| Code | HTTP | Use case |
|---|---|---|
| `BAD_REQUEST` | 400 | Invalid input that Zod missed, business rule violation |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Record doesn't exist |
| `CONFLICT` | 409 | Duplicate record, state conflict |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected failure |

---

## Database Access Patterns

### Always use the Drizzle query builder

```typescript
// ✅ Correct: Drizzle query builder
const item = await ctx.db
  .select()
  .from(catalogItems)
  .where(eq(catalogItems.id, input.id))
  .limit(1)
  .then(r => r[0]);

if (!item) throw new TRPCError({ code: "NOT_FOUND", ... });

// ❌ Wrong: raw SQL string
const item = await ctx.db.execute(`SELECT * FROM catalog_item WHERE id = '${input.id}'`);
// (also a SQL injection risk if not using parameterized queries)
```

### Transactions for multi-step mutations

```typescript
// Use Drizzle transactions for multi-step writes
const result = await ctx.db.transaction(async (tx) => {
  const [list] = await tx
    .insert(lists)
    .values({ name: input.name })
    .returning();

  const itemRows = input.items.map(item => ({
    listId: list.id,
    catalogItemId: item.catalogItemId,
    targetCases: item.targetCases,
  }));

  await tx.insert(listItems).values(itemRows);

  return list;
});
```

---

## Procedure Structure Template

```typescript
// src/server/api/routers/domain.ts
import { z } from "zod";
import { eq, ilike, and, desc } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { tableName } from "@/server/db/schema";

export const domainRouter = createTRPCRouter({

  // List / search
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const [items, [{ count }]] = await Promise.all([
        ctx.db
          .select()
          .from(tableName)
          .where(input.search ? ilike(tableName.name, `%${input.search}%`) : undefined)
          .orderBy(desc(tableName.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(tableName),
      ]);
      return { items, total: count };
    }),

  // Get by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db
        .select()
        .from(tableName)
        .where(eq(tableName.id, input.id))
        .limit(1)
        .then(r => r[0]);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return item;
    }),

  // Create
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
    }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(tableName)
        .values(input)
        .returning();
      return item;
    }),

  // Update
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(256).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [item] = await ctx.db
        .update(tableName)
        .set(data)
        .where(eq(tableName.id, id))
        .returning();
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return item;
    }),

  // Delete
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(tableName)
        .where(eq(tableName.id, input.id))
        .returning();
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      return { id: deleted.id };
    }),
});
```

---

## Constraints

1. No procedure accepts unbounded input (string length limits required)
2. No procedure returns unbounded results (pagination required for list endpoints)
3. All UUIDs validated as `z.string().uuid()`
4. All enums validated as `z.enum([...])` with all valid values listed
5. Mutations never return `void` — always return the affected record

---

## Anti-patterns

- `.input(z.any())` — always define the schema
- Procedures with > 10 input fields — split into multiple procedures or use separate schemas
- `protectedProcedure` that doesn't use `ctx.session` — if you don't need auth, use `publicProcedure` explicitly
- Duplicating Zod schemas across routers — extract to `src/types/schemas.ts`

---

## AI-Agent Instructions

When generating or modifying tRPC procedures:
1. Use the procedure structure template above as the baseline
2. Always validate inputs with Zod — never accept `z.any()`
3. Always return the affected record from mutations
4. Throw `TRPCError` for expected failures — never let DB errors bubble up as 500s
5. Paginate all list endpoints — never return unbounded arrays

---

## Production Considerations

- tRPC input validation runs server-side — do not rely on client-side validation alone
- Large queries (catalog list with 10k items) must use `limit` + `offset` — not `.all()`
- `ctx.db` is the database connection — do not create new connections in procedures
- Transaction rollback on error is automatic in Drizzle — do not catch and re-throw inside a transaction unnecessarily
