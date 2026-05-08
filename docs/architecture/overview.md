# SmartOrder — Architecture Overview

## Purpose

This document defines the authoritative system architecture for SmartOrder. It describes how layers interact, where data flows, and which architectural patterns are in use. AI agents must read this before modifying any cross-cutting concern.

---

## Responsibilities

- Define the layered architecture and responsibilities of each layer
- Describe integration boundaries (AI, OCR, database, storage)
- Establish which patterns are canonical vs. forbidden
- Prevent architectural drift as the system grows

---

## System Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App Router                  │
│         (React Server Components + Client Components)   │
├──────────────────────┬──────────────────────────────────┤
│   Zustand Stores     │    tRPC Client (React Query)     │
│   (ephemeral UI)     │    (server state, cache)         │
├──────────────────────┴──────────────────────────────────┤
│                    tRPC API Layer                        │
│       (routers: catalog, lists, backroom, ocr)          │
├─────────────────────────────────────────────────────────┤
│                  Business Logic                          │
│      (lib/inventory, lib/ocr, lib/scan, lib/vision)     │
├──────────────┬──────────────┬──────────────────────────┤
│  Drizzle ORM │  OpenAI API  │  AWS Textract / SAM       │
│  (PostgreSQL)│  (parsing)   │  (OCR + segmentation)    │
└──────────────┴──────────────┴──────────────────────────┘
```

---

## Layer Descriptions

### 1. Next.js App Router (Presentation)

- All routes live under `src/app/(app)/` (protected) or `src/app/` (public)
- Server Components fetch data via tRPC server client (`src/trpc/server.ts`)
- Client Components use `src/trpc/react.tsx` hooks (React Query under the hood)
- Layout components in `src/components/layout/` — do not add page-level logic here
- Page components are thin: they pass data to feature components, nothing more

**Rules:**
- No business logic in page or layout files
- No direct database access from components (always via tRPC)
- Prefer Server Components for initial data load; Client Components for interactivity

### 2. State Management

Two separate state concerns:

| Store type | Tool | What it holds |
|---|---|---|
| Server state | tRPC + React Query | All database data, lists, catalog items, snapshots |
| Ephemeral UI state | Zustand | Scan session in-progress, modal state, pending selections |

**Rules:**
- Never store server data in Zustand (that's React Query's job)
- Never use `useEffect` to fetch data (use tRPC query hooks)
- Zustand stores are defined in `src/stores/` — one file per domain

### 3. tRPC API Layer

- All routers in `src/server/api/routers/`
- Root router assembled in `src/server/api/root.ts`
- Every procedure uses Zod for input validation
- `protectedProcedure` for all app operations (auth context required)
- Mutation procedures return the updated record, not `void`

**Current routers:**
- `catalog` — CRUD for catalog items, search
- `lists` — list creation, item management, scan tracking
- `backroom` — snapshot management, vision processing
- (planned) `ocr` — document upload, parsing job tracking

### 4. Business Logic (lib/)

- Pure TypeScript modules with no framework dependencies
- No database access — accept data as arguments, return transformed data
- All OCR parsing, inventory matching, and fuzzy search logic lives here
- AI prompting utilities live in `src/lib/ai/`

**Rules:**
- Business logic files must be unit-testable in isolation
- No `import` from `src/server/` in `src/lib/` files
- No React imports in `src/lib/` files

### 5. Drizzle ORM / PostgreSQL

- Schema defined in `src/server/db/schema.ts` — single source of truth
- All database access through Drizzle query builder or SQL template literals
- No raw string SQL outside of `src/server/db/`
- Migrations managed via `pnpm drizzle-kit generate` → `drizzle/` folder

### 6. External Services

| Service | Purpose | Access pattern |
|---|---|---|
| AWS Textract | PDF/image OCR | Async job via tRPC mutation → background processing |
| OpenAI API | Structured parsing, matching | Direct call in server-side lib functions |
| Segment Anything (SAM) | Visual segmentation in BackroomVision | Async image processing job |
| Vercel Blob | Image/document storage | Upload from client → server validates → store |

---

## Data Flow: Order Guide Import

```
Client uploads PDF/image
       ↓
tRPC mutation: backroom.createSnapshot or ocr.startJob
       ↓
Server: upload to Vercel Blob, create DB record
       ↓
Background: AWS Textract async job
       ↓
Textract webhook / polling: raw text result stored
       ↓
OpenAI structured output: parse raw text → CatalogItem[]
       ↓
Human review: flagged low-confidence items shown in UI
       ↓
Confirmed items: inserted into catalogItems table
```

## Data Flow: Scan Session

```
User creates list (from catalog items)
       ↓
Scan session opens (guided mode, one item at a time)
       ↓
Camera OR Zebra scanner detects scan event
       ↓
Zustand: update in-progress scan state
       ↓
tRPC mutation: lists.updateScannedCount (debounced)
       ↓
Session completes → list status → "complete"
       ↓
Export: generate shareable output (CSV / printable HTML)
```

---

## Constraints

1. No microservices — this is a monolith; all logic in the Next.js app
2. No GraphQL — tRPC is the API layer
3. No Prisma — Drizzle ORM only
4. All AI calls are server-side only (API keys never exposed to client)
5. File uploads go to Vercel Blob, never to the PostgreSQL DB
6. Scan session state is client-authoritative (Zustand) with server sync on completion

---

## Anti-patterns

- **Bypassing tRPC**: never call `db` directly from a React component
- **Fat pages**: never put business logic in `app/(app)/*/page.tsx`
- **Dual state**: never mirror server state in Zustand (creates sync bugs)
- **Schema proliferation**: never create a new schema file; extend `schema.ts`
- **Client-side AI calls**: never import OpenAI in a client component
- **Sync OCR**: never block the request while Textract processes a document
- **God routers**: one router per domain; never put unrelated procedures together

---

## Rules

1. All routes are protected by default — no unauthenticated data access
2. All mutations return the affected record
3. All AI-produced data carries a `confidence` field
4. File storage references (URLs) are stored in PostgreSQL, files in Blob storage
5. Background jobs (OCR, vision) update DB status; UI polls via React Query
6. The schema is the contract between layers — change it carefully

---

## Examples

**Correct**: Page component calls `api.catalog.list.useQuery()` → renders items.

**Incorrect**: Page component imports `db` from `src/server/db/index.ts`.

**Correct**: Scan session progress stored in Zustand, synced to server on completion.

**Incorrect**: Scan progress stored only in `useState` (lost on navigation).

**Correct**: OCR starts an async Textract job, returns job ID, UI polls status.

**Incorrect**: OCR call blocks the HTTP request for 30 seconds.

---

## AI-Agent Instructions

Before modifying architecture:
1. Read this document fully
2. Read `src/server/db/schema.ts` to understand the data model
3. Read `src/server/api/root.ts` to see all registered routers
4. Do NOT create new router files without checking for an existing domain router
5. Do NOT add new tables without reading the existing schema and checking for extension opportunities
6. External service integrations always go through a tRPC procedure (never direct client calls)
7. Any new background job must update a `status` field on its parent record

---

## Production Considerations

- Drizzle migrations must be backward-compatible (additive, never destructive in one step)
- New tRPC procedures must be tested with Zod validation before deployment
- Textract jobs have a per-page cost — implement file size limits and page caps
- OpenAI calls must have retry logic and timeout handling
- React Query cache TTLs must be set intentionally — default is fine for most catalog data, but scan sessions should have `staleTime: 0`
