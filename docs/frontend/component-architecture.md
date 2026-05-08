# SmartOrder — Component Architecture

## Purpose

Defines how React components are organized, sized, authored, and composed in SmartOrder. The goal is a predictable, maintainable component tree where every file has a clear purpose and a narrow responsibility. AI agents must read this before generating any new component file.

---

## Responsibilities

- Define the component hierarchy and where each type lives
- Establish file size limits and extraction triggers
- Define the rules for client vs. server components
- Specify how components receive data and handle state

---

## Component Hierarchy

```
src/components/
  ui/           ← ShadCN primitives only (Button, Input, Card, Badge, etc.)
  layout/       ← App shell, sidebar, nav, bottom bar
  dashboard/    ← Dashboard-specific feature components
  lists/        ← Order list building, scan session
  search/       ← Catalog search and browse
  backroom/     ← BackroomVision capture and display
  settings/     ← Settings rows and configuration
```

### Layer rules

| Layer | Purpose | Can import from |
|---|---|---|
| `ui/` | Primitives | External packages only (no app code) |
| `layout/` | Shell structure | `ui/`, `lib/`, `hooks/` |
| Feature components | Domain UI | `ui/`, `layout/`, `lib/`, `hooks/`, `trpc/` |

No feature component imports from another feature folder. `dashboard/` never imports from `lists/`.

---

## Server Components vs. Client Components

The default is **Server Component**. Add `"use client"` only when needed.

| Reason to add "use client" | Example |
|---|---|
| useState or useReducer | Scan session counter |
| useEffect (non-data) | Camera stream, event listeners |
| Browser APIs | `navigator.mediaDevices`, `localStorage` |
| Event handlers passed as props | onClick, onSubmit |
| tRPC query/mutation hooks | Any `api.xxx.useQuery()` call |
| Zustand store | `useScanStore()` |
| ShadCN components with interaction | Dialog, Popover, Sheet |

```tsx
// ✅ Server Component: reads data, renders markup
// src/app/(app)/lists/page.tsx
import { api } from "@/trpc/server";

export default async function ListsPage() {
  const { items } = await api.lists.list();
  return <ListGrid lists={items} />;
}
```

```tsx
// ✅ Client Component: needs interactivity
// src/components/lists/scan-session.tsx
"use client";
import { useScanStore } from "@/stores/scan-store";
```

---

## Component File Structure

```tsx
// [FILENAME: component-name.tsx]

// 1. "use client" directive (if needed)
"use client";

// 2. Imports (ordered per engineering/conventions.md)
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";

// 3. Types (co-located, not exported unless shared)
type ComponentProps = {
  listId: string;
  onComplete?: () => void;
};

// 4. Constants (if needed)
const MAX_QUANTITY = 999;

// 5. Main component export (named, not default)
export function ComponentName({ listId, onComplete }: ComponentProps) {
  // a. Hooks first (in this order: external hooks, tRPC, Zustand, useState, useMemo)
  const { data, isLoading } = api.lists.getById.useQuery({ id: listId });
  const updateMutation = api.lists.updateScannedCount.useMutation();
  const [localCount, setLocalCount] = useState(0);

  // b. Derived values (useMemo only when expensive)
  const progress = data ? (data.scannedItems / data.totalItems) * 100 : 0;

  // c. Event handlers (prefixed with "handle")
  function handleIncrement() {
    setLocalCount(c => c + 1);
    updateMutation.mutate({ listId, count: localCount + 1 });
  }

  // d. Loading state
  if (isLoading) return <ComponentNameSkeleton />;

  // e. Render
  return (
    <div>
      {/* ... */}
    </div>
  );
}

// 6. Sub-components (private, in same file, no export unless reused elsewhere)
function ComponentNameSkeleton() {
  return <div className="animate-pulse h-24 bg-muted rounded-md" />;
}
```

---

## Component Size Limits

| Limit | Rule |
|---|---|
| 200 lines per file | Soft limit — start looking for extractions |
| 300 lines per file | Hard limit — must extract before merging |
| 3 levels of JSX nesting | Soft limit — consider extracting inner components |
| 5 hooks in one component | Soft limit — consider a custom hook |

### What to extract

- **Sub-components**: a logical chunk of JSX that has its own props
- **Custom hooks**: any `useEffect` + state combination with a clear purpose
- **Helper functions**: pure computations that don't need to be in the render function

### Extraction decision tree

```
Is this JSX subtree used in more than one place?
  → Yes: extract to its own file in the same folder
  → No: extract as a private function in the same file (below the main export)

Does this hook logic appear in more than one component?
  → Yes: extract to src/hooks/use-[name].ts
  → No: keep as a local function or inline
```

---

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Component file | `kebab-case.tsx` | `scan-session.tsx` |
| Component function | `PascalCase` | `ScanSession` |
| Props type | `PascalCase + Props` | `ScanSessionProps` |
| Event handlers | `handle[Event]` | `handleMarkScanned` |
| Boolean props | `is[State]` or `has[Thing]` | `isLoading`, `hasError` |
| Render helpers | `render[Part]` (use sparingly) | `renderQuantityStepper` |

---

## Loading and Error States

Every component that fetches data must handle three states:

```tsx
export function CatalogItemList({ vendorFilter }: Props) {
  const { data, isLoading, error } = api.catalog.list.useQuery({ vendor: vendorFilter });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load items"
        description={error.message}
        action={<Button onClick={() => window.location.reload()}>Retry</Button>}
      />
    );
  }

  if (!data?.items.length) {
    return (
      <EmptyState
        title="No items found"
        description="Try a different search or add items manually"
      />
    );
  }

  return (
    <div className="space-y-2">
      {data.items.map(item => <CatalogItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

Skeleton shapes must match content shapes to prevent layout shift.

---

## Optimistic Updates

For scan session count increments, use optimistic updates to feel instant:

```typescript
const incrementMutation = api.lists.updateScannedCount.useMutation({
  onMutate: async ({ listItemId, count }) => {
    // Cancel outgoing refetches
    await utils.lists.getWithItems.cancel({ listId });

    // Snapshot previous value
    const prev = utils.lists.getWithItems.getData({ listId });

    // Optimistically update
    utils.lists.getWithItems.setData({ listId }, old => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map(item =>
          item.id === listItemId ? { ...item, scannedCases: count } : item
        ),
      };
    });

    return { prev };
  },
  onError: (_, __, context) => {
    // Rollback on error
    if (context?.prev) {
      utils.lists.getWithItems.setData({ listId }, context.prev);
    }
  },
});
```

---

## Constraints

1. No component imports from `src/server/` (server code stays server-side)
2. No business logic in JSX render — extract to handlers or hooks
3. No hardcoded IDs or strings in components — use `props` or named constants
4. No inline `style` props — use Tailwind classes
5. No `default export` for reusable components (only for Next.js page/layout files)

---

## Anti-patterns

- Components that fetch their own data AND render complex sub-trees AND handle mutations (do one thing)
- Prop drilling more than 2 levels deep (use Zustand or React context)
- `children: React.ReactNode` used to pass non-UI logic
- Wrapping everything in `Suspense` without a meaningful fallback

---

## AI-Agent Instructions

When generating components:
1. Default to Server Component unless the needs-client criteria are met
2. Follow the file structure template exactly (types → constants → component → sub-components)
3. Skeleton loaders must have the same height as the content they replace
4. Every component that calls a mutation must handle the `isLoading` state on the trigger button
5. Loading/error/empty — all three states are required for every data-fetching component

---

## Production Considerations

- Server Components improve initial page performance (no JS bundle for static UI)
- Client Component boundaries should be as deep in the tree as possible
- Large Client Component subtrees slow down page hydration — keep them leaf-heavy
- `useQuery` with `enabled: false` for queries that shouldn't run immediately (e.g., search before 2 chars)
