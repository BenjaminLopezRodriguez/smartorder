// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { index, pgTableCreator } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `smartorder_${name}`);

export const catalogItems = createTable(
  "catalog_item",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.varchar({ length: 256 }).notNull(),
    vendor: d.varchar({ length: 256 }),
    category: d.varchar({ length: 128 }),
    packSize: d.varchar({ length: 64 }),
    unitType: d.varchar({ length: 32 }).notNull().default("case"),
    barcode: d.varchar({ length: 64 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("catalog_item_name_idx").on(t.name),
    index("catalog_item_vendor_idx").on(t.vendor),
  ],
);

export const lists = createTable(
  "list",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.varchar({ length: 256 }).notNull(),
    status: d.varchar({ length: 16 }).notNull().default("draft"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("list_updated_at_idx").on(t.updatedAt)],
);

export const listItems = createTable(
  "list_item",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    listId: d
      .uuid()
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    catalogItemId: d
      .uuid()
      .notNull()
      .references(() => catalogItems.id, { onDelete: "restrict" }),
    targetCases: d.integer().notNull().default(0),
    targetUnits: d.integer().notNull().default(0),
    scannedCases: d.integer().notNull().default(0),
    scannedUnits: d.integer().notNull().default(0),
    sortOrder: d.integer().notNull().default(0),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("list_item_list_idx").on(t.listId),
    index("list_item_catalog_idx").on(t.catalogItemId),
  ],
);

export const orderGuides = createTable(
  "order_guide",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.varchar({ length: 256 }).notNull(),
    vendor: d.varchar({ length: 256 }),
    sourceType: d.varchar({ length: 16 }).notNull(),
    fileUrl: d.text(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("order_guide_created_at_idx").on(t.createdAt),
    index("order_guide_vendor_idx").on(t.vendor),
  ],
);

export const orderGuideItems = createTable(
  "order_guide_item",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    orderGuideId: d
      .uuid()
      .notNull()
      .references(() => orderGuides.id, { onDelete: "cascade" }),
    rawName: d.varchar({ length: 512 }).notNull(),
    normalizedName: d.varchar({ length: 512 }),
    vendor: d.varchar({ length: 256 }),
    category: d.varchar({ length: 128 }),
    packSize: d.varchar({ length: 64 }),
    unitType: d.varchar({ length: 32 }).notNull().default("case"),
    barcode: d.varchar({ length: 64 }),
    sortOrder: d.integer().notNull().default(0),
    catalogItemId: d
      .uuid()
      .references(() => catalogItems.id, { onDelete: "set null" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("order_guide_item_guide_idx").on(t.orderGuideId),
    index("order_guide_item_catalog_idx").on(t.catalogItemId),
  ],
);

export const barcodeScans = createTable(
  "barcode_scan",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    rawValue: d.text().notNull(),
    symbology: d.varchar({ length: 32 }),
    source: d.varchar({ length: 32 }).notNull().default("camera"),
    listId: d.uuid().references(() => lists.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [
    index("barcode_scan_created_at_idx").on(t.createdAt),
    index("barcode_scan_raw_value_idx").on(t.rawValue),
    index("barcode_scan_list_idx").on(t.listId),
  ],
);

export const backroomSnapshots = createTable(
  "backroom_snapshot",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    location: d.varchar({ length: 256 }).notNull(),
    imageUrl: d.text().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  }),
  (t) => [index("backroom_snapshot_created_at_idx").on(t.createdAt)],
);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("name_idx").on(t.name)]
);
