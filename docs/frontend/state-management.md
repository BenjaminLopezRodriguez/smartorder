# SmartOrder — State Management

## Purpose

Defines how state is managed in SmartOrder: which tool manages which type of state, where stores live, and how to avoid the most common state management mistakes in React applications.

---

## Responsibilities

- Define the boundary between server state and client state
- Document each Zustand store and what it owns
- Establish React Query (tRPC) cache conventions
- Prevent dual-state bugs and unnecessary re-renders

---

## Two Types of State

SmartOrder has a clean boundary between state types:

| Type | Tool | What belongs here |
|---|---|---|
| **Server state** | tRPC + React Query | Catalog items, lists, list items, backroom snapshots, OCR jobs |
| **Ephemeral UI state** | Zustand | Active scan session progress, modal open/close, pending UI selections |

This is the most important rule in state management: **never put server data in Zustand**.

---

## Server State (React Query / tRPC)

### What it is

Server state is any data that:
- Lives in the database
- Can change from another session/device
- Needs cache invalidation after mutations

### How to use it

```typescript
// Read data
const { data, isLoading, error } = api.catalog.list.useQuery({
  search: query,
  limit: 50,
});

// Write data (mutation)
const utils = api.useUtils();
const createMutation = api.catalog.create.useMutation({
  onSuccess: () => {
    // Invalidate the list query to refetch after create
    void utils.catalog.list.invalidate();
  },
});
```

### Cache TTL guidelines

| Data type | staleTime | gcTime | Rationale |
|---|---|---|---|
| Catalog items | 5 minutes | 10 minutes | Changes infrequently |
| Lists | 2 minutes | 5 minutes | May change on another device |
| Active scan session list | 0 | 1 minute | Must always be fresh |
| Backroom snapshots | 5 minutes | 10 minutes | Rarely updated |
| OCR job status | 0 | 30 seconds | Polling; must be fresh |

```typescript
// Setting staleTime per query
const { data } = api.catalog.list.useQuery(
  { limit: 50 },
  { staleTime: 5 * 60 * 1000 }
);

// Active scan session: always fresh
const { data: scanList } = api.lists.getWithItems.useQuery(
  { listId },
  { staleTime: 0, refetchOnWindowFocus: true }
);
```

---

## Client State (Zustand)

### What it is

Client state is any data that:
- Does not exist in the database (yet)
- Is purely UI-driven (modal open, selected tab)
- Is in-progress / ephemeral (ongoing scan session)

### Current stores

#### `src/stores/ui-store.ts` — General UI state

```typescript
type UIState = {
  sidebarOpen: boolean;
  activeModal: string | null;
};

type UIActions = {
  openSidebar: () => void;
  closeSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
};

export const useUIStore = create<UIState & UIActions>()((set) => ({
  sidebarOpen: false,
  activeModal: null,
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
```

#### `src/stores/scan-store.ts` — Scan session state (persisted)

```typescript
type ScanState = {
  activeListId: string | null;
  currentItemIndex: number;
  scannedCounts: Record<string, number>; // listItemId → count
  sessionStartedAt: string | null;       // ISO string for serialization
  pendingSyncIds: string[];              // listItemIds with unsynced counts
};

type ScanActions = {
  startSession: (listId: string) => void;
  setCount: (listItemId: string, count: number) => void;
  incrementCount: (listItemId: string) => void;
  advanceItem: () => void;
  markSynced: (listItemIds: string[]) => void;
  resetSession: () => void;
};

export const useScanStore = create<ScanState & ScanActions>()(
  persist(
    (set, get) => ({
      activeListId: null,
      currentItemIndex: 0,
      scannedCounts: {},
      sessionStartedAt: null,
      pendingSyncIds: [],

      startSession: (listId) =>
        set({
          activeListId: listId,
          currentItemIndex: 0,
          scannedCounts: {},
          sessionStartedAt: new Date().toISOString(),
          pendingSyncIds: [],
        }),

      setCount: (listItemId, count) =>
        set((s) => ({
          scannedCounts: { ...s.scannedCounts, [listItemId]: count },
          pendingSyncIds: Array.from(new Set([...s.pendingSyncIds, listItemId])),
        })),

      incrementCount: (listItemId) => {
        const current = get().scannedCounts[listItemId] ?? 0;
        get().setCount(listItemId, current + 1);
      },

      advanceItem: () =>
        set((s) => ({ currentItemIndex: s.currentItemIndex + 1 })),

      markSynced: (ids) =>
        set((s) => ({
          pendingSyncIds: s.pendingSyncIds.filter((id) => !ids.includes(id)),
        })),

      resetSession: () =>
        set({
          activeListId: null,
          currentItemIndex: 0,
          scannedCounts: {},
          sessionStartedAt: null,
          pendingSyncIds: [],
        }),
    }),
    {
      name: "smartorder-scan-v1",
      partialize: (s) => ({
        activeListId: s.activeListId,
        currentItemIndex: s.currentItemIndex,
        scannedCounts: s.scannedCounts,
        sessionStartedAt: s.sessionStartedAt,
        pendingSyncIds: s.pendingSyncIds,
      }),
    }
  )
);
```

---

## Sync Pattern (Zustand ↔ Server)

The scan store accumulates counts locally. They sync to the server via a debounced mutation:

```typescript
// In the scan session component
const syncMutation = api.lists.batchUpdateScannedCounts.useMutation({
  onSuccess: (_, variables) => {
    markSynced(variables.updates.map(u => u.listItemId));
  },
});

// Debounced sync — fire 2 seconds after last change
const debouncedSync = useMemo(
  () =>
    debounce((updates: Array<{ listItemId: string; count: number }>) => {
      syncMutation.mutate({ listId, updates });
    }, 2000),
  [listId, syncMutation]
);

// Trigger sync when pendingSyncIds changes
useEffect(() => {
  if (pendingSyncIds.length === 0) return;
  const updates = pendingSyncIds.map(id => ({
    listItemId: id,
    count: scannedCounts[id] ?? 0,
  }));
  debouncedSync(updates);
}, [pendingSyncIds, scannedCounts]);

// Final sync on session complete (immediate, not debounced)
async function handleSessionComplete() {
  if (pendingSyncIds.length > 0) {
    await syncMutation.mutateAsync({ listId, updates: getAllPending() });
  }
  resetSession();
  onComplete();
}
```

---

## Selector Pattern (Prevent Over-rendering)

Use Zustand selectors to subscribe only to the slice of state you need:

```typescript
// ❌ Wrong: subscribes to entire store (re-renders on any change)
const store = useScanStore();
const count = store.scannedCounts[listItemId];

// ✅ Correct: subscribes only to this item's count
const count = useScanStore(s => s.scannedCounts[listItemId] ?? 0);
```

---

## Constraints

1. Server data is never stored in Zustand (no exceptions)
2. Zustand stores use `persist` middleware for any state that must survive a page refresh
3. Persisted store keys are versioned (`smartorder-scan-v1`) so schema changes don't corrupt state
4. Selectors always extract the minimum required state
5. No `useContext` for global state — use Zustand exclusively

---

## Anti-patterns

| Anti-pattern | Why forbidden |
|---|---|
| `useState` for fetched data | Creates two sources of truth with server |
| Storing catalog items in Zustand | That's React Query's job |
| Syncing Zustand → React Query manually | Use mutation `onSuccess` → `invalidate()` |
| Top-level Zustand subscriptions | Causes unnecessary renders — use selectors |
| Non-persisted scan state | Lost on browser close/refresh |

---

## Rules

1. All scan session state is in `scan-store` with `persist` middleware
2. All server data is managed by React Query via tRPC
3. Cache invalidation happens in mutation `onSuccess` callbacks
4. Scan store key includes a version suffix — increment when shape changes
5. Pending sync IDs are tracked explicitly so no counts are silently lost

---

## AI-Agent Instructions

When adding new state:
1. Ask: "is this in the database?" → Yes → use tRPC query. No → consider Zustand.
2. Ask: "does this need to survive a page refresh?" → Yes → use `persist` middleware
3. Never `set({ allItems: data })` in Zustand from a fetch call
4. Always use a selector when subscribing to a Zustand store
5. When adding fields to `scan-store`, increment the version key

---

## Production Considerations

- Zustand `persist` stores to `localStorage` — 5MB limit; scan state must be compact
- Do not store full catalog item objects in the scan store — store IDs and counts only
- React Query's `gcTime` is the client-side cache retention — increase on slow networks
- On app startup, check for an active scan session in the store and prompt the user to resume
