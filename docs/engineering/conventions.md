# SmartOrder — Engineering Conventions

## Purpose

Defines the canonical code style, naming, and structural conventions for all SmartOrder development. Consistent conventions reduce cognitive overhead, prevent merge conflicts on trivial style disagreements, and make AI-generated code predictable and reviewable.

---

## Responsibilities

- Define file naming, import, and module structure
- Establish TypeScript, tRPC, and Drizzle patterns
- Set the standard for component authoring
- Define what belongs where in the project tree

---

## File Naming

| Type | Convention | Example |
|---|---|---|
| React components | `kebab-case.tsx` | `scan-session.tsx` |
| React page files | `page.tsx` | `app/(app)/lists/page.tsx` |
| Drizzle schema | `schema.ts` (single file) | `server/db/schema.ts` |
| tRPC routers | `[domain].ts` | `routers/catalog.ts` |
| Zustand stores | `[domain]-store.ts` | `stores/ui-store.ts` |
| Hooks | `use-[name].ts` | `hooks/use-media-query.ts` |
| Lib utilities | `[name].ts` (noun/verb) | `lib/inventory-match.ts` |
| Type files | `[domain].types.ts` | `types/scan.types.ts` |
| Constants | `[domain].const.ts` | `lib/scan.const.ts` |

---

## Import Order

Always in this order, separated by blank lines:

```typescript
// 1. Node built-ins (rarely needed in Next.js)
import path from "path";

// 2. External packages
import { z } from "zod";
import { eq, and } from "drizzle-orm";

// 3. Internal: @/ aliased paths
import { db } from "@/server/db";
import { catalogItems } from "@/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// 4. Relative imports
import { InventoryCard } from "./inventory-card";
import type { ScanItem } from "../types/scan.types";
```

---

## TypeScript Rules

### No `any`
```typescript
// Wrong
function parseItem(data: any): any { ... }

// Correct
function parseItem(data: unknown): ParsedCatalogItem | null { ... }
```

### Prefer `type` over `interface` for data shapes
```typescript
// Preferred
type CatalogItem = {
  id: string;
  name: string;
  vendor: string | null;
};

// Use interface only for extension hierarchies
interface ScanEventHandler {
  onScan(barcode: string): void;
  onError(err: Error): void;
}
```

### Explicit return types on all exported functions
```typescript
// Wrong
export function formatPackSize(packSize: string) {
  return packSize.toUpperCase();
}

// Correct
export function formatPackSize(packSize: string): string {
  return packSize.toUpperCase();
}
```

### Use `satisfies` for config objects
```typescript
const queryConfig = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
} satisfies import("@tanstack/react-query").QueryObserverOptions;
```

---

## tRPC Conventions

### Router structure
```typescript
// src/server/api/routers/catalog.ts
import { z } from "zod";
import { eq, ilike, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { catalogItems } from "@/server/db/schema";

export const catalogRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      vendor: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      // implementation
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      vendor: z.string().max(256).optional(),
      packSize: z.string().max(64).optional(),
      unitType: z.enum(["case", "unit", "each", "lb"]),
      barcode: z.string().max(64).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [item] = await ctx.db
        .insert(catalogItems)
        .values(input)
        .returning();
      return item;  // Always return the created record
    }),
});
```

### Mutation return convention
All mutations return the affected record(s). Never return `void` or just `{ success: true }`.

### Error handling in procedures
```typescript
import { TRPCError } from "@trpc/server";

// Throw typed TRPC errors
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Catalog item not found",
});

// For validation beyond Zod
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "List is already complete and cannot be modified",
});
```

---

## Drizzle ORM Conventions

### Schema additions
```typescript
// Always use the createTable helper
export const newDomainRecords = createTable(
  "new_domain_record",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    // ... fields
    createdAt: d.timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    // index every foreign key and every frequently queried column
    index("new_domain_record_fk_idx").on(t.parentId),
  ],
);
```

### Query patterns
```typescript
// Prefer named imports from drizzle-orm
import { eq, and, or, ilike, desc, asc, sql } from "drizzle-orm";

// Simple select
const items = await db
  .select()
  .from(catalogItems)
  .where(eq(catalogItems.vendor, "Dean's"))
  .orderBy(asc(catalogItems.name))
  .limit(50);

// Join
const listWithItems = await db
  .select({
    item: listItems,
    catalog: catalogItems,
  })
  .from(listItems)
  .innerJoin(catalogItems, eq(listItems.catalogItemId, catalogItems.id))
  .where(eq(listItems.listId, listId));
```

---

## Component Conventions

### Structure
```tsx
// src/components/lists/scan-session.tsx

// 1. Imports
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import type { ListWithItems } from "@/types/list.types";

// 2. Types (co-located)
type ScanSessionProps = {
  listId: string;
  onComplete: () => void;
};

// 3. Component (default export)
export function ScanSession({ listId, onComplete }: ScanSessionProps) {
  // hooks first
  const { data } = api.lists.getWithItems.useQuery({ listId });
  const [currentIndex, setCurrentIndex] = useState(0);

  // derived state
  const currentItem = data?.items[currentIndex];
  const isComplete = currentIndex >= (data?.items.length ?? 0);

  // handlers
  function handleMarkScanned() { ... }

  // render
  return (...);
}
```

### Size limit
Components over 200 lines should be split. Extract:
- Sub-components (below the main export in the same file, or into a separate file if reused)
- Custom hooks (`hooks/use-scan-session.ts`)
- Helper functions (`lib/scan-helpers.ts`)

### No default exports for components
Exception: Next.js page and layout files require default exports.
```typescript
// Wrong (for reusable components)
export default function ScanSession() { ... }

// Correct
export function ScanSession() { ... }

// Next.js page (required exception)
export default function Page() { ... }
```

---

## Zustand Store Conventions

```typescript
// src/stores/scan-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ScanState = {
  activeListId: string | null;
  currentItemIndex: number;
  scannedCounts: Record<string, number>; // listItemId -> count
  sessionStartedAt: Date | null;
};

type ScanActions = {
  startSession: (listId: string) => void;
  incrementCount: (listItemId: string) => void;
  advanceItem: () => void;
  resetSession: () => void;
};

export const useScanStore = create<ScanState & ScanActions>()(
  persist(
    (set) => ({
      // initial state
      activeListId: null,
      currentItemIndex: 0,
      scannedCounts: {},
      sessionStartedAt: null,

      // actions
      startSession: (listId) =>
        set({ activeListId: listId, currentItemIndex: 0, sessionStartedAt: new Date() }),

      incrementCount: (listItemId) =>
        set((s) => ({
          scannedCounts: {
            ...s.scannedCounts,
            [listItemId]: (s.scannedCounts[listItemId] ?? 0) + 1,
          },
        })),

      advanceItem: () => set((s) => ({ currentItemIndex: s.currentItemIndex + 1 })),

      resetSession: () =>
        set({ activeListId: null, currentItemIndex: 0, scannedCounts: {}, sessionStartedAt: null }),
    }),
    { name: "smartorder-scan" },  // localStorage key
  ),
);
```

---

## Constraints

1. No barrel exports (`index.ts` re-exports) — import directly from source files
2. No circular imports between `server/` and `components/`
3. No `console.log` in committed code — use the structured logger
4. No hardcoded strings for status values — use `const` enums or string literal unions
5. No `!` (non-null assertion) except where TypeScript genuinely can't infer and the invariant is obvious

---

## Anti-patterns

- `as any` to silence TypeScript — fix the type instead
- `Object.keys(thing).map(...)` without proper typing
- `fetch()` directly from components — all data goes through tRPC
- Giant `useEffect` blocks — decompose into hooks or server data
- Inline styles (`style={{ ... }}`) — use Tailwind classes
- Magic numbers — name them as constants

---

## AI-Agent Instructions

When generating code for SmartOrder:
1. Follow all naming conventions in this file exactly
2. Every new tRPC procedure must have Zod input validation
3. Every new Drizzle table must index its foreign keys
4. Components must not import from `src/server/` — only `src/lib/` and `src/trpc/`
5. Generate types alongside implementations — never leave implicit `any`
6. When in doubt about where code belongs, check the architecture overview first

---

## Production Considerations

- Run `pnpm typecheck` and `pnpm lint` in CI — no exceptions
- Drizzle schema changes require a migration: `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`
- All new DB columns should have sensible defaults or be nullable — never add `NOT NULL` without a default to an existing table in one migration
