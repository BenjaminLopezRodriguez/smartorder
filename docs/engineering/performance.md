# SmartOrder — Performance Standards

## Purpose

Defines performance targets, measurement methods, and optimization techniques for SmartOrder. Performance in a warehouse context is non-negotiable — a slow app during an order prep session is a broken app.

---

## Performance Targets

| Metric | Target | Critical limit |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | < 4.0s |
| FID / INP (Interaction to Next Paint) | < 100ms | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 |
| TTFB (Time to First Byte) | < 800ms | < 1.5s |
| Scan session: tap to feedback | < 50ms | < 100ms |
| Search: keystroke to results | < 200ms | < 400ms |
| File upload to job created | < 3s (10MB file) | < 5s |
| Page navigation (SPA) | < 100ms | < 300ms |

---

## Critical Paths (Never Degrade)

These interactions must meet their targets on a mid-range mobile device on 4G:

1. **Scan count increment** → haptic + visual feedback in < 50ms
2. **"Mark Scanned" tap** → advance to next item in < 100ms
3. **Catalog search** → first results in < 200ms
4. **List page load** → content visible in < 2.5s
5. **Session resume** → last position restored in < 500ms

---

## Bundle Size

| Bundle | Target | Measure with |
|---|---|---|
| First load JS (per page) | < 200KB gzipped | `next build` output |
| Largest shared chunk | < 100KB gzipped | bundle-analyzer |
| Total page payload (HTML + JS + CSS) | < 500KB | Lighthouse |

### Bundle rules

- Do NOT import entire libraries when only one function is needed:
```typescript
// ❌ Wrong: imports entire lodash
import _ from "lodash";
const debounced = _.debounce(fn, 150);

// ✅ Correct: named import (still bad for lodash — use native)
const debounce = (fn: Function, ms: number) => { ... }; // just write it
```

- Import `lucide-react` icons by name, not the entire package:
```typescript
// ✅ Correct: tree-shakeable
import { Package, ScanLine } from "lucide-react";
```

---

## React Performance

### Prevent unnecessary re-renders in scan session

The scan session re-renders on every count increment. Isolate expensive renders:

```typescript
// ✅ Memoize list items that don't change
const ItemRow = memo(function ItemRow({ item }: { item: ListItem }) {
  const count = useScanStore(s => s.scannedCounts[item.id] ?? 0); // selector
  return <div>{item.name}: {count}</div>;
});

// Only re-renders when THIS item's count changes
```

### Use `startTransition` for non-urgent updates

```typescript
import { startTransition } from "react";

function handleSearch(value: string) {
  // Urgent: update input immediately
  setInputValue(value);

  // Non-urgent: search can wait
  startTransition(() => {
    setSearchQuery(value);
  });
}
```

### Virtualize long lists

For catalog lists > 100 items:
```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 64, // match actual row height
});
```

---

## Image Performance

All images in SmartOrder are either:
1. Backroom snapshots (user-uploaded, served via Vercel Blob CDN)
2. UI icons (lucide-react, SVG — no images)

Rules for snapshots:
- Compress client-side to ≤ 1MB before upload (see `docs/features/backroom-vision.md`)
- Serve from Vercel Blob CDN (auto edge-cached)
- Show thumbnail in list views, full image only in detail view
- Use `next/image` for any static image assets in the app

```tsx
// Correct: Vercel Blob image with loading state
<img
  src={snapshot.imageUrl}
  alt={`Backroom snapshot: ${snapshot.location}`}
  loading="lazy"
  decoding="async"
  className="object-cover rounded-md"
/>
```

---

## Database Query Performance

Slow queries kill perceived performance for data-heavy screens.

### Requirements

- Catalog list (50 items, with filters): < 50ms
- List detail with items: < 100ms
- Scan count update: < 20ms (this is in the critical scan path)
- Search (fuzzy, 10k items): < 200ms

### Monitoring

Add query timing in development:
```typescript
// Development-only query logger (not in production)
if (process.env.NODE_ENV === "development") {
  db.$on("query", (e) => {
    if (e.duration > 100) {
      console.warn(`[slow query] ${e.duration}ms`, e.query.substring(0, 100));
    }
  });
}
```

---

## Next.js Performance Patterns

### Prefer Server Components for initial loads

Server Components eliminate client-side JS for the initial render. Use them for:
- All list/detail pages (catalog, lists, snapshots)
- Static layout elements (sidebar, header)

### Prefetch navigation

```typescript
import { useRouter } from "next/navigation";
const router = useRouter();

// On list item hover: prefetch the detail page
function ListCard({ list }: { list: List }) {
  return (
    <Link href={`/lists/${list.id}`} prefetch={true}>
      {/* ... */}
    </Link>
  );
}
```

### React Query prefetching on server

```typescript
// In Server Components: prefetch data for client components
export default async function ListsPage() {
  const helpers = await createServerSideHelpers();
  await helpers.lists.list.prefetch({ limit: 50 });
  return (
    <HydrationBoundary state={dehydrate(helpers.queryClient)}>
      <ListGrid />
    </HydrationBoundary>
  );
}
```

---

## Scan Session Performance (Critical)

The scan session is the most performance-critical screen.

Rules:
1. No API call blocks the count increment UI update (optimistic update first)
2. Sync to server is debounced 2 seconds — never in the tap handler
3. Camera frame processing capped at 15fps
4. No state that causes re-renders of the full item list on each count change
5. `transform` and `opacity` only for transitions (GPU-composited)

```typescript
// Count increment: purely local (< 1ms)
function handleIncrement() {
  incrementCount(currentItem.id); // Zustand update only
  triggerHaptic();
  showVisualFeedback();
  // Server sync happens in a debounced background effect
}
```

---

## Anti-patterns

- Blocking the scan tap handler with any async operation
- Loading full catalog items into Zustand (re-renders entire list on any change)
- Importing entire utility libraries for one function
- Not debouncing search queries (hammers the server on every keystroke)
- Returning unlimited DB results to the client

---

## Measurement

```bash
# Lighthouse CI (in browser)
pnpm lighthouse http://localhost:3000/dashboard --output=html

# Bundle analysis
pnpm build && pnpm analyze
```

---

## AI-Agent Instructions

When writing performance-sensitive code:
1. Scan session mutation handlers must be synchronous — defer server sync to a background effect
2. Use Zustand selectors (never subscribe to the whole store) in scan session components
3. Memoize `ItemRow` components with `React.memo` in the scan list
4. Always debounce search queries at 150ms
5. Use `loading="lazy"` on all backroom snapshot images in list views

---

## Production Considerations

- Set up Vercel Speed Insights for real-user performance monitoring
- Alert on INP > 200ms in scan session pages (indicates blocking interactions)
- Monitor database query times via Neon analytics
- Test on real hardware (iPhone 12 equivalent) — DevTools simulation is optimistic
