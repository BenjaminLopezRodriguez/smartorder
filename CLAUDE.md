# SmartOrder — AI Coding Agent Operating Instructions

> This file is the primary instruction set for ALL AI coding agents (Claude Code, Cursor, Copilot, etc.)
> working on this codebase. Read this file completely before writing any code.

---

## 1. What SmartOrder Is

SmartOrder is an **operational inventory companion** for warehouse and backroom workers.

It is:
- A guided scan-session workflow tool
- A searchable inventory catalog platform
- An order-prep list builder (voice + search + camera)
- A backroom visual-memory system (BackroomVision)
- A Zebra scanner workflow companion

It is NOT:
- A POS or procurement platform
- Consumer shopping software
- A replacement for Zebra handheld scanners
- A general-purpose inventory management system
- An e-commerce or restaurant ordering app

**Core loop (never break this):**
1. Import order guide (PDF/photo → OCR → structured catalog)
2. Build order-prep list (voice / search / camera scan)
3. Run guided scan session (item-by-item, count cases/units)
4. Review quantities
5. Export / reference final list

---

## 2. Tech Stack (authoritative)

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + ShadCN UI |
| State (client) | Zustand |
| Data fetching | React Query (via tRPC) |
| API | tRPC v11 |
| ORM | **Drizzle ORM** (NOT Prisma) |
| Database | PostgreSQL |
| OCR | AWS Textract |
| AI parsing | OpenAI structured outputs |
| Computer vision | Segment Anything Model (SAM) |
| Search | Fuzzy search (fuse.js or pg_trgm) |

**Never suggest**: Prisma, GraphQL, REST endpoints alongside tRPC, Redux, or any AI provider other than OpenAI for structured parsing unless explicitly approved.

---

## 3. Architecture Rules

### File structure
```
src/
  app/(app)/           # Protected app routes
  components/
    ui/                # Primitive ShadCN components only
    layout/            # Shell, sidebar, nav
    dashboard/         # Dashboard-specific
    lists/             # List-building and scan session
    search/            # Search and inventory browse
    backroom/          # BackroomVision components
    settings/          # Settings rows
  server/
    api/
      routers/         # One file per domain (catalog, lists, backroom)
      trpc.ts
      root.ts
    db/
      schema.ts        # Single Drizzle schema file
      index.ts
  stores/              # Zustand stores (one per domain)
  hooks/               # Custom hooks
  lib/                 # Pure utilities (no side effects)
```

### Schema conventions (Drizzle)
- All tables prefixed with `smartorder_` via `createTable`
- UUIDs for all primary keys (`.uuid().primaryKey().defaultRandom()`)
- Always add `createdAt` and `updatedAt`
- Index foreign keys and frequently queried columns
- `onDelete: "cascade"` for child records, `"restrict"` for referenced catalog items

### tRPC conventions
- Input validation with Zod on every procedure
- Use `protectedProcedure` for all app routes (auth required)
- Return typed objects, never raw DB rows
- One router per domain in `src/server/api/routers/`

---

## 4. UX Non-Negotiables

These rules apply to every component and every screen:

| Rule | Reason |
|---|---|
| Touch targets ≥ 48px on mobile | Gloved warehouse hands |
| No animations > 150ms | Operational speed |
| Text contrast ≥ 4.5:1 | Bright warehouse lighting |
| Prefer text labels over icons-only | Fast comprehension |
| One primary action per screen | Reduce cognitive load |
| No modals for destructive confirmation | Use inline confirm patterns |
| Bottom navigation on mobile | Thumb-reachable |

**The app must feel like enterprise operational software, not a consumer app.**

Design reference: Zebra device UIs, Kroger internal tools, warehouse management dashboards.

---

## 5. AI Engineering Rules

### Anti-hallucination (critical)
- NEVER return inventory data without a `confidence` score (0–1)
- ALWAYS preserve the raw OCR text that produced a structured item (`ocrSource`)
- NEVER auto-apply AI suggestions without user confirmation on destructive actions
- ALWAYS surface low-confidence items for manual review (threshold: < 0.75)
- Log all AI calls with input hash, model, token count, latency, and output

### Structured output pattern
```typescript
// Always use Zod schemas for OpenAI structured outputs
const CatalogItemSchema = z.object({
  name: z.string(),
  vendor: z.string().nullable(),
  packSize: z.string().nullable(),
  unitType: z.enum(["case", "unit", "each", "lb"]),
  confidence: z.number().min(0).max(1),
  ocrSource: z.string(), // raw OCR text this was extracted from
});
```

### AI call error handling
- Wrap all AI calls in try/catch with typed error returns
- Retry transient errors (429, 503) with exponential backoff (max 3 retries)
- On failure: return partial results + error context, never throw to UI

---

## 6. What AI Agents Must NEVER Do

1. **Never add Prisma** — this project uses Drizzle ORM exclusively
2. **Never add REST API routes** — use tRPC exclusively for API
3. **Never invent database tables** — extend `schema.ts` only with approval
4. **Never add client-side state for server data** — use React Query/tRPC
5. **Never use `any` type** — always use proper TypeScript types
6. **Never skip Zod input validation** on tRPC procedures
7. **Never use `useEffect` for data fetching** — use tRPC query hooks
8. **Never hallucinate inventory quantities** — show uncertainty, not guesses
9. **Never add external packages** without checking if existing deps cover the need
10. **Never build features outside the core loop** without explicit instruction

---

## 7. Component Authoring Rules

- Use ShadCN primitives (`src/components/ui/`) as the base layer
- Never style ShadCN internals — extend via `className` prop
- Keep components under 200 lines; extract sub-components when larger
- Co-locate component-specific types in the same file
- No business logic in components — use hooks or tRPC calls
- All user-facing strings must be readable without context (no abbreviations)
- Mobile-first: build for 375px width, then expand

---

## 8. Performance Standards

- Initial page load (LCP): < 2.5s
- Interaction response: < 100ms perceived
- Search results: < 200ms on catalog of 10k items
- Image upload: show optimistic progress immediately
- Scan session transitions: < 50ms (no layout shift)

---

## 9. Current Domain Models

```
catalogItem    → the inventory item (name, vendor, pack size, unit type, barcode)
list           → an order-prep list (name, status: draft|active|complete)
listItem       → a line on a list (catalogItemId, targetCases, scannedCases, etc.)
backroomSnapshot → a photo of the backroom (location, imageUrl, optional annotations)
```

Never add fields to these models without reading `src/server/db/schema.ts` first.

---

## 10. Key Files to Read Before Making Changes

| Task | Read first |
|---|---|
| Any DB change | `src/server/db/schema.ts` |
| Any API change | `src/server/api/root.ts` + relevant router |
| Any UI component | `src/components/ui/` — check if it already exists |
| List building | `src/components/lists/scan-session.tsx` |
| BackroomVision | `src/components/backroom/` |
| Search | `src/components/search/` |
| Navigation | `src/lib/nav.ts` + `src/components/layout/` |

---

## 11. Git & Commit Conventions

- Commit messages: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`
- Never commit `.env` files
- Run `pnpm typecheck` before committing schema or API changes
- Migration files go in `drizzle/` — never edit manually after running

---

## 12. Reference Documents

| Topic | File |
|---|---|
| Product philosophy | `docs/product/philosophy.md` |
| Architecture overview | `docs/architecture/overview.md` |
| Engineering conventions | `docs/engineering/conventions.md` |
| Anti-patterns | `docs/engineering/anti-patterns.md` |
| Operational UX rules | `docs/ux/operational-ux.md` |
| Warehouse UX | `docs/ux/warehouse-ux.md` |
| AI engineering patterns | `docs/ai/engineering-patterns.md` |
| Anti-hallucination rules | `docs/ai/anti-hallucination.md` |
| OCR pipeline | `docs/features/ocr-pipeline.md` |
| Scan session | `docs/flows/scan-session.md` |
| BackroomVision | `docs/features/backroom-vision.md` |
| Search behavior | `docs/features/search.md` |
| Component architecture | `docs/frontend/component-architecture.md` |
| Design system | `docs/frontend/design-system.md` |
| Database patterns | `docs/backend/database.md` |
| tRPC conventions | `docs/backend/api-conventions.md` |
| Error handling | `docs/engineering/error-handling.md` |
| Testing strategy | `docs/engineering/testing.md` |
| Security | `docs/engineering/security.md` |
| Simplify product (MVP guide) | `docs/simplify-product.md` |
