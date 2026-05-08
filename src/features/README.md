# Feature Domains

Each subdirectory is a self-contained domain. Components, hooks, server logic, utils,
types, stores, and schemas for a feature live inside its folder.

**Rule:** Features must not import deeply across domain boundaries.
Shared types belong in `src/types/`. Shared server utilities belong in `src/server/`.

## Domain Map

| Domain | Responsibility |
|---|---|
| `inventory/` | Catalog items, normalization, CRUD |
| `scanning/` | Scan session workflow, barcode resolution |
| `order-guides/` | CSV/PDF import, guide management |
| `backroomvision/` | Camera capture, snapshots, CV pipeline |
| `voice/` | Voice input, speech-to-text |
| `search/` | Catalog search UI and hooks |
| `lists/` | Order-prep list management |
| `ai/` | AI extraction UI, confidence review flows |

## Migration Status

> Most existing components still live in `src/components/` pending migration.
> New feature code should be written inside the appropriate domain folder.
> Existing code migrates incrementally — do not move files without updating all imports.

### TODO: migrate existing components into domains
- `src/components/lists/` → `src/features/lists/components/`
- `src/components/search/` → `src/features/search/components/`
- `src/components/order-guides/` → `src/features/order-guides/components/`
- `src/components/backroom/` → `src/features/backroomvision/components/`
- `src/components/barcodes/` → `src/features/scanning/components/`
- `src/components/catalog/` → `src/features/inventory/components/`
- `src/server/api/routers/lists.ts` → logic extracted to `src/features/lists/server/`
- `src/server/api/routers/orderGuides.ts` → logic to `src/features/order-guides/server/`
- `src/lib/order-guide-csv.ts` → `src/features/order-guides/utils/`
