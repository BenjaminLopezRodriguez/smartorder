# SmartOrder — Testing Strategy

## Purpose

Defines the testing philosophy, tools, and coverage expectations for SmartOrder. The goal is a test suite that catches real bugs, runs fast enough to be part of every commit cycle, and focuses on the highest-risk surfaces in the codebase.

---

## Responsibilities

- Define what to test and what not to test
- Establish the testing tools and conventions
- Set coverage expectations for critical paths
- Define test file naming and organization

---

## Testing Philosophy

> **Test behavior, not implementation. Test the critical path, not every permutation.**

SmartOrder's highest-risk surfaces (in order):
1. Scan session state transitions (Zustand store)
2. Inventory matching logic (fuzzy + AI)
3. OCR parse result validation (Zod schemas)
4. tRPC input validation (Zod + business rules)
5. Quantity calculations (scanned vs. target)

These areas deserve the most test coverage. Generic CRUD operations need minimal tests.

---

## Test Tools

| Tool | Purpose |
|---|---|
| `vitest` | Unit and integration tests |
| `@testing-library/react` | Component testing |
| `@testing-library/user-event` | User interaction simulation |
| `msw` (Mock Service Worker) | API mocking for component tests |
| `playwright` | End-to-end tests for critical flows |

No `jest` — use `vitest` (compatible API, faster, native ESM support).

---

## Test File Location

Co-locate test files with source files:

```
src/
  lib/
    inventory-match.ts
    inventory-match.test.ts     ← unit test
  stores/
    scan-store.ts
    scan-store.test.ts          ← unit test
  components/
    lists/
      scan-session.tsx
      scan-session.test.tsx     ← component test
  server/
    api/
      routers/
        catalog.ts
        catalog.test.ts         ← integration test (with real db or mock)
tests/
  e2e/
    scan-session.spec.ts        ← Playwright E2E
  fixtures/
    ocr/
      sample-order-guide.txt    ← real OCR text for testing parsers
```

---

## Unit Tests

### What to unit test

- `src/lib/` functions (pure business logic)
- Zustand store actions and state transitions
- Zod schema validation
- Query normalization and matching logic
- Confidence threshold helpers

### Unit test pattern

```typescript
// src/lib/inventory-match.test.ts
import { describe, it, expect } from "vitest";
import { normalizeQuery, matchInventoryItem } from "./inventory-match";

describe("normalizeQuery", () => {
  it("expands oz abbreviation", () => {
    expect(normalizeQuery("16 oz milk")).toBe("16 ounce milk");
  });

  it("expands gal abbreviation", () => {
    expect(normalizeQuery("milk 1 gal")).toBe("milk 1 gallon");
  });

  it("handles mixed case and extra spaces", () => {
    expect(normalizeQuery("  WHOLE   MILK  ")).toBe("whole milk");
  });
});

describe("matchInventoryItem", () => {
  const catalog = [
    { id: "1", name: "Whole Milk 1 Gallon", vendor: "Dean's", packSize: "4/CS", ... },
    { id: "2", name: "2% Milk 1 Gallon", vendor: "Dean's", packSize: "4/CS", ... },
    { id: "3", name: "Orange Juice 64oz", vendor: "Tropicana", packSize: "6/CS", ... },
  ];

  it("returns high confidence for close match", async () => {
    const result = await matchInventoryItem("whole milk gallon", catalog);
    expect(result).not.toBeNull();
    expect(result?.confidence).toBeGreaterThan(0.80);
    expect(result?.item.id).toBe("1");
  });

  it("returns null for barcode not in catalog", async () => {
    const result = await matchInventoryItem("012345678901", catalog);
    expect(result).toBeNull();
  });

  it("returns exact barcode match when found", async () => {
    const catalogWithBarcode = [{ ...catalog[0], barcode: "012345678901" }];
    const result = await matchInventoryItem("012345678901", catalogWithBarcode);
    expect(result?.confidence).toBe(1.0);
    expect(result?.matchMethod).toBe("exact_barcode");
  });
});
```

### Zustand store tests

```typescript
// src/stores/scan-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useScanStore } from "./scan-store";

describe("scan store", () => {
  beforeEach(() => {
    useScanStore.getState().resetSession();
  });

  it("starts a session with correct initial state", () => {
    useScanStore.getState().startSession("list-1");
    const state = useScanStore.getState();
    expect(state.activeListId).toBe("list-1");
    expect(state.currentItemIndex).toBe(0);
    expect(state.scannedCounts).toEqual({});
  });

  it("increments count for an item", () => {
    useScanStore.getState().startSession("list-1");
    useScanStore.getState().incrementCount("item-1");
    useScanStore.getState().incrementCount("item-1");
    expect(useScanStore.getState().scannedCounts["item-1"]).toBe(2);
  });

  it("adds item to pendingSyncIds on count change", () => {
    useScanStore.getState().startSession("list-1");
    useScanStore.getState().setCount("item-1", 3);
    expect(useScanStore.getState().pendingSyncIds).toContain("item-1");
  });
});
```

---

## Component Tests

Test components from the user's perspective — what they see and what they can do:

```tsx
// src/components/lists/scan-session.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScanSession } from "./scan-session";
import { createTestList } from "@/tests/factories";

describe("ScanSession", () => {
  it("shows the current item name", () => {
    const list = createTestList({ items: [{ name: "Whole Milk 1 Gallon" }] });
    render(<ScanSession listId={list.id} />);
    expect(screen.getByText("Whole Milk 1 Gallon")).toBeInTheDocument();
  });

  it("increments count when + button is pressed", async () => {
    const user = userEvent.setup();
    render(<ScanSession listId="test-list" />);
    const incrementButton = screen.getByRole("button", { name: /increase quantity/i });
    await user.click(incrementButton);
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("advances to next item after Mark Scanned", async () => {
    const user = userEvent.setup();
    const list = createTestList({ items: [
      { name: "Item 1" },
      { name: "Item 2" },
    ]});
    render(<ScanSession listId={list.id} />);
    await user.click(screen.getByRole("button", { name: /mark scanned/i }));
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });
});
```

---

## tRPC Integration Tests

Test tRPC procedures with a real (test) database:

```typescript
// src/server/api/routers/catalog.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createInnerTRPCContext } from "@/server/api/trpc";
import { catalogRouter } from "./catalog";

describe("catalog router", () => {
  const ctx = createInnerTRPCContext({ session: mockSession });
  const caller = catalogRouter.createCaller(ctx);

  it("creates a catalog item", async () => {
    const item = await caller.create({
      name: "Whole Milk 1 Gallon",
      vendor: "Dean's",
      unitType: "case",
    });
    expect(item.id).toBeDefined();
    expect(item.name).toBe("Whole Milk 1 Gallon");
  });

  it("rejects item creation with empty name", async () => {
    await expect(caller.create({ name: "", unitType: "case" }))
      .rejects.toThrow();
  });
});
```

---

## E2E Tests (Playwright)

Focus on the critical path only:

```typescript
// tests/e2e/scan-session.spec.ts
import { test, expect } from "@playwright/test";

test("complete scan session", async ({ page }) => {
  await page.goto("/lists");
  await page.click("text=Create New List");
  await page.fill('[name="listName"]', "Test Session");
  await page.click("text=Create List");

  // Start scan session
  await page.click("text=Start Scan Session");
  await expect(page.locator("[data-testid='current-item-name']")).toBeVisible();

  // Scan an item
  await page.click("[data-testid='increment-btn']");
  await page.click("text=Mark Scanned");

  // Session should advance
  await expect(page.locator("text=Item 2 of")).toBeVisible();
});
```

E2E tests cover:
1. Order guide import (happy path)
2. List creation and item addition
3. Scan session: start → scan items → complete → export
4. BackroomVision: capture → view snapshot
5. Search: find item → add to list

---

## Coverage Expectations

| Area | Target coverage | Reason |
|---|---|---|
| `src/lib/` | 90%+ | Pure logic; cheap to test |
| Zustand stores | 85%+ | Critical state; high-value tests |
| tRPC routers | 70%+ | Input validation; business rules |
| Components | 50%+ | Focus on critical interaction paths |
| E2E flows | Core path only | Expensive; test what matters |

These are minimums, not goals. More tests are better where they test behavior.

---

## What NOT to Test

- Drizzle ORM internals (trust the library)
- ShadCN component library (trust the library)
- TypeScript type errors (that's `tsc`'s job)
- Purely static content (no logic to verify)
- Snapshot tests (brittle, low signal)

---

## Test Fixtures

```typescript
// tests/factories.ts
import type { CatalogItem, List, ListItem } from "@/types";

export function createTestCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: crypto.randomUUID(),
    name: "Test Item",
    vendor: "Test Vendor",
    packSize: "4/CS",
    unitType: "case",
    barcode: null,
    category: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

---

## CI Requirements

```yaml
# .github/workflows/ci.yml (relevant test step)
- name: Type check
  run: pnpm typecheck

- name: Unit and integration tests
  run: pnpm test --run

- name: E2E tests (on main branch only)
  if: github.ref == 'refs/heads/main'
  run: pnpm playwright test
```

---

## AI-Agent Instructions

When writing tests:
1. Test behavior, not implementation — test what the user/caller observes
2. Use `vitest`, not `jest`
3. Co-locate test files with source files
4. Use the factory functions in `tests/factories.ts` for test data
5. Critical paths (scan session, inventory matching) require tests before merging

---

## Production Considerations

- Unit tests run in < 5 seconds; integration tests < 30 seconds; E2E < 5 minutes
- Failed tests block merges to `main` — configure branch protection rules
- E2E tests run against a staging environment with a seeded test database
- Do not write tests that hit the real OpenAI or Textract APIs — mock them
