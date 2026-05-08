# SmartOrder — Database Patterns (Drizzle + PostgreSQL)

## Purpose

Defines the database design standards, Drizzle ORM patterns, and migration strategy for SmartOrder. The database is the source of truth for all persistent data. Schema decisions are permanent — understand them before making changes.

---

## Responsibilities

- Define the canonical schema design patterns
- Establish migration workflow
- Set indexing requirements
- Define referential integrity rules

---

## ORM: Drizzle (Not Prisma)

SmartOrder uses **Drizzle ORM** exclusively. Do not install Prisma. Do not import `@prisma/client`. Drizzle's schema is TypeScript — all schema changes happen in `src/server/db/schema.ts`.

### Why Drizzle

- Zero runtime overhead (generates SQL, no abstraction layer)
- Type-safe SQL builder that doesn't hide what's happening
- Schema is TypeScript (not a separate .prisma file)
- Migrations are plain SQL (auditable, portable)

---

## Schema File Location

All tables are defined in a single file: `src/server/db/schema.ts`

Never create additional schema files. Extend the single file.

### Table name prefix

All tables use the `smartorder_` prefix via the `createTable` helper:

```typescript
export const createTable = pgTableCreator((name) => `smartorder_${name}`);

// Creates table: smartorder_catalog_item
export const catalogItems = createTable("catalog_item", ...);
```

---

## Current Schema

### catalogItems
```typescript
export const catalogItems = createTable("catalog_item", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  name: d.varchar({ length: 256 }).notNull(),
  vendor: d.varchar({ length: 256 }),
  category: d.varchar({ length: 128 }),
  packSize: d.varchar({ length: 64 }),
  unitType: d.varchar({ length: 32 }).notNull().default("case"),
  barcode: d.varchar({ length: 64 }),
  // Planned: aiGenerated, aiConfidence, ocrJobId, ocrSource
  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));
```

### lists
```typescript
export const lists = createTable("list", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  name: d.varchar({ length: 256 }).notNull(),
  status: d.varchar({ length: 16 }).notNull().default("draft"),
  // status values: "draft" | "active" | "complete"
  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));
```

### listItems
```typescript
export const listItems = createTable("list_item", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  listId: d.uuid().notNull().references(() => lists.id, { onDelete: "cascade" }),
  catalogItemId: d.uuid().notNull().references(() => catalogItems.id, { onDelete: "restrict" }),
  targetCases: d.integer().notNull().default(0),
  targetUnits: d.integer().notNull().default(0),
  scannedCases: d.integer().notNull().default(0),
  scannedUnits: d.integer().notNull().default(0),
  sortOrder: d.integer().notNull().default(0),
  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));
```

### backroomSnapshots
```typescript
export const backroomSnapshots = createTable("backroom_snapshot", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  location: d.varchar({ length: 256 }).notNull(),
  imageUrl: d.text().notNull(),
  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  // Planned: thumbnailUrl, capturedBy, notes, segmentationStatus, itemGroupsJson, receivedDate
}));
```

---

## Schema Design Rules

### Primary keys
Always UUID, always `defaultRandom()`:
```typescript
id: d.uuid().primaryKey().defaultRandom(),
```

### Timestamps
Every table must have `createdAt`. `updatedAt` is required for mutable records.
```typescript
createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
```

### String fields
Always include a max length. Common sizes:
```typescript
d.varchar({ length: 32 })   // short codes, status values, unit types
d.varchar({ length: 64 })   // barcodes, SKUs, pack sizes
d.varchar({ length: 128 })  // categories, short labels
d.varchar({ length: 256 })  // names, vendors, locations (most strings)
d.text()                     // unlimited: URLs, JSON blobs, raw OCR text
```

### Status fields
Use `varchar` with application-level enum validation (not PG enum type — easier to migrate):
```typescript
status: d.varchar({ length: 16 }).notNull().default("draft"),
// Application validates: "draft" | "active" | "complete"
```

### Nullable vs. optional
- `null` in the DB = field is genuinely absent (vendor not known)
- `default` = field always has a value, defaulted if not provided
- Do not use empty strings as null substitutes

---

## Indexing Requirements

Index every:
1. Foreign key column
2. Column used in `WHERE` clauses frequently
3. Column used in `ORDER BY` on large tables

```typescript
// In the table definition (third argument)
(t) => [
  index("list_item_list_idx").on(t.listId),           // FK index
  index("list_item_catalog_idx").on(t.catalogItemId), // FK index
  index("catalog_item_name_idx").on(t.name),          // search index
  index("catalog_item_vendor_idx").on(t.vendor),      // filter index
]
```

For fuzzy search: add GIN trigram index via a manual migration (after initial table creation):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX catalog_item_name_trgm_idx ON smartorder_catalog_item USING gin (name gin_trgm_ops);
```

---

## Referential Integrity

| Relationship | onDelete rule | Reason |
|---|---|---|
| `listItem → list` | `cascade` | Deleting a list removes all its items |
| `listItem → catalogItem` | `restrict` | Cannot delete a catalog item in use |
| `ocrJob → catalogItem` | `set null` | Deleting a job doesn't remove imported items |

Never use `no action` (implicit default) — always be explicit.

---

## Migration Workflow

```bash
# 1. Modify src/server/db/schema.ts
# 2. Generate migration
pnpm drizzle-kit generate

# 3. Review the generated SQL in drizzle/
# 4. Apply to local DB
pnpm drizzle-kit migrate

# 5. Apply to production (via CI or manually)
pnpm drizzle-kit migrate --config=drizzle-prod.config.ts
```

### Migration safety rules

1. **Never delete a column in one migration** — rename first (multi-step migration)
2. **New `NOT NULL` columns must have a `DEFAULT`** — otherwise existing rows fail
3. **Never rename a table directly** — create new table, migrate data, drop old
4. **Test migrations on a copy of production data** before applying

### Example safe column addition
```sql
-- ✅ Safe: new column with default
ALTER TABLE smartorder_catalog_item
  ADD COLUMN ai_confidence real;  -- nullable, no breaking change

-- ❌ Unsafe: new NOT NULL without default
ALTER TABLE smartorder_catalog_item
  ADD COLUMN ai_confidence real NOT NULL;  -- fails on existing rows
```

---

## Query Performance Guidelines

### Use `LIMIT` everywhere
```typescript
// ✅ Always bounded
.limit(50)

// ❌ Never unbounded on user-facing queries
.select().from(catalogItems)  // without limit
```

### Prefer joins over multiple queries
```typescript
// ✅ One query with join
const result = await db
  .select({ list: lists, item: listItems, catalog: catalogItems })
  .from(lists)
  .leftJoin(listItems, eq(listItems.listId, lists.id))
  .leftJoin(catalogItems, eq(listItems.catalogItemId, catalogItems.id))
  .where(eq(lists.id, listId));

// ❌ N+1 pattern
const list = await db.select().from(lists).where(eq(lists.id, listId));
const items = await Promise.all(list[0].itemIds.map(id => db.select()...));
```

---

## Constraints

1. All schema changes go through the migration workflow — never `ALTER TABLE` manually in production
2. All tables have `createdAt` — no exceptions
3. All foreign key columns have an index — no exceptions
4. `onDelete` behavior is explicitly specified on every foreign key
5. No raw string SQL in application code (use Drizzle query builder or tagged `sql` template)

---

## Anti-patterns

- Storing JSON blobs in varchar fields — use `text()` or a dedicated JSONB column
- Using PG serial IDs for new tables — always UUID
- Adding `NOT NULL` to an existing column without a DEFAULT in the same migration
- Creating additional schema files (`schema-v2.ts`) — extend the single file
- Dropping columns that are still referenced in application code

---

## AI-Agent Instructions

Before modifying the schema:
1. Read `src/server/db/schema.ts` in full — understand all existing tables
2. Add new tables at the bottom of the file, after existing tables
3. Always include `createdAt` and `updatedAt` on mutable records
4. Always index foreign keys in the table's third argument
5. Run `pnpm drizzle-kit generate` after changes — review the generated SQL before applying
6. New columns on existing tables must be nullable or have a DEFAULT

---

## Production Considerations

- Neon PostgreSQL (or Vercel Postgres) supports connection pooling — use the pooled URL for app, unpooled for migrations
- `drizzle-kit migrate` is idempotent — safe to run on deploy
- Enable `pg_trgm` extension as a one-time manual step in production (not via Drizzle migrations)
- Monitor slow queries via Neon query inspector or `pg_stat_statements`
- Alert on queries > 500ms in production
