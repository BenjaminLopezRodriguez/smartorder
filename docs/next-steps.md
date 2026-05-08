# SmartOrder — Immediate Next Steps & Engineering Direction

**Version:** Post-MVP Foundation
**Audience:** Claude Code, Cursor Agents, AI Engineering Systems
**Priority:** HIGH

---

## Purpose

This document defines:

- What to build next
- How to think about the system
- Architectural priorities
- Operational UX constraints
- Production-readiness targets
- Anti-patterns to avoid
- Long-term platform direction

This document is NOT optional. Read it before implementing major features.

---

## Current Project State

The project currently has:

- Next.js 15 App Router
- React 19
- TypeScript strict mode
- Tailwind v4 + shadcn
- tRPC v11
- Drizzle ORM
- Neon PostgreSQL
- List workflows
- Order-guide ingestion flows
- Scan-session routes
- Barcode rendering/scanning
- BackroomVision foundation
- Operational UI shell

The project is entering **architecture stabilization phase**. Poor decisions now will permanently damage maintainability.

---

## Core Product Understanding

SmartOrder is **NOT**:

- Inventory e-commerce
- A POS
- A shopping app
- A procurement platform
- A Zebra replacement

SmartOrder **IS**:

- Operational memory infrastructure
- Inventory workflow augmentation
- OCR-driven operational tooling
- Guided warehouse workflow software
- Scan-assisted inventory intelligence

The application should feel like a **calm operational companion** — not a flashy AI product.

---

## Most Important Product Insight

The Zebra scanner already exists. The phone/web app:

- Tracks workflow state
- Tracks scan progress
- Structures operational data
- Reduces cognitive load
- Remembers inventory state
- Guides users linearly

The app **augments** reality. It does **not** replace existing operational systems.

---

## Engineering Priorities

### Priority 1 — Remove Debug/Agent Logging

**Current issue:** localhost fetches fire on every request — unnecessary outbound calls, technical debt risk, deployment instability.

- Remove all `#region agent log` blocks from `src/env.js` and `src/server/db/index.ts`
- Remove all leftover agent instrumentation
- Remove all localhost request hooks

**Do this first.**

---

### Priority 2 — Feature Domain Isolation

**Current risk:** cross-feature coupling, duplicated business logic, architectural entropy.

Create `src/features/` with isolated domains:

```
src/features/
  inventory/
  scanning/
  order-guides/
  backroomvision/
  voice/
  search/
  lists/
  ai/
```

Each feature contains:

```
components/
hooks/
server/
utils/
types/
stores/
schemas/
```

Rules:

- Features must not import deeply across domains
- Shared types belong in shared/type layers
- Business logic stays inside domain boundaries

---

### Priority 3 — Shared Inventory Type System

**Current risk:** duplicated inventory models, inconsistent normalization, AI-generated type drift.

Create `src/types/inventory.ts` as the canonical inventory type file. All systems must reference it:

- OCR
- Search
- Scan sessions
- Catalog
- AI parsing
- Recommendations
- BackroomVision

---

### Priority 4 — Inventory Normalization Pipeline

SmartOrder's moat is **operational document normalization**.

Create `src/server/inventory-normalization/` responsible for:

- Normalizing product names
- Canonicalizing UPCs
- Detecting duplicates
- Fuzzy-reconciling vendor names
- Resolving packaging variations
- Inferring categories

Example:

```
BOLILLOS
Bolillo Bread
Bolillo 12pk
→ canonical inventory entity
```

Rules:

- Preserve raw OCR source
- Preserve provenance
- Preserve confidence scores
- Never overwrite raw data

---

### Priority 5 — OCR Confidence + Provenance

Every OCR extraction must include:

```typescript
{
  value: string;
  confidence: number;
  sourcePage?: number;
  sourceLine?: number;
  extractionMethod?: string;
}
```

AI systems must:

- Preserve uncertainty
- Preserve provenance
- Avoid hallucination
- Allow manual correction

Never flatten uncertain OCR into fake certainty.

---

### Priority 6 — Scan Session UX Refinement

The scan session is the signature workflow. Protect it aggressively.

The UX should feel: **linear, calm, fast, highly readable, operationally focused.**

Avoid:

- Modal spam
- Excessive state transitions
- Clutter
- Hidden interactions
- Dashboard complexity

The scan workflow should minimize taps, minimize thinking, minimize navigation.

---

### Priority 7 — BackroomVision Architecture

BackroomVision must become an isolated subsystem at `src/features/backroomvision/`.

Subdomains:

- Segmentation
- OCR
- Snapshot ingestion
- Inventory estimation
- Historical comparison
- Aging detection

Rules:

- Isolate CV systems
- Isolate AI pipelines
- Isolate image processing
- Avoid leaking CV logic into UI

---

### Priority 8 — AI Pipeline Isolation

**Current risk:** AI prompts scattered across routers, inconsistent parsing logic, duplicated extraction behavior.

Create `src/server/ai/`:

```
prompts/
schemas/
extractors/
validators/
normalizers/
recommendations/
```

Rules:

- Prompts must be versioned
- Schemas must be typed (Zod)
- Validation required before persistence
- AI outputs are never trusted directly

---

### Priority 9 — Search Quality

Search must feel: **instant, forgiving, operational.**

Implement:

- Fuzzy matching
- Synonym support
- Typo tolerance
- Vendor aliases
- UPC prioritization
- Historical ranking

Optimize for **finding inventory quickly** — not perfect semantic relevance.

---

### Priority 10 — Production Hardening

Begin adding:

- Error-boundary systems
- Loading-state consistency
- Optimistic UI standards
- Retry systems
- Upload-failure recovery
- API validation hardening
- Observability hooks
- Structured logging

---

## Do Not Build Yet

Hold off on:

- RBAC
- Advanced auth
- Multi-tenant org systems
- Analytics dashboards
- Predictive AI ordering
- Autonomous workflows
- ERP integrations
- Complex notification systems

The operational workflow must stabilize first.

---

## UX Targets

Optimize for **warehouse throughput** — not engagement.

Metrics that matter:

- Fewer taps
- Faster scanning
- Lower cognitive load
- Faster list completion
- Faster inventory lookup
- Fewer operational mistakes

---

## Performance Targets

- Instant-feeling search
- Sub-100ms interactions
- Smooth scanning workflows
- Zero UI jank
- Fast transitions
- Minimal rerenders

Avoid giant client trees, excessive providers, overuse of global state, expensive hydration.

---

## Component Philosophy

Prefer:

- Small, focused components
- Domain-isolated components
- Highly composable UI
- Feature-scoped logic

Avoid:

- Mega-components
- Giant prop chains
- Business logic in pages
- Duplicated workflows

---

## State Management Philosophy

- **Zustand** — UI state only
- **tRPC / React Query** — all server state
- **Local component state** — whenever possible

Avoid global business state, giant stores, and duplicated cache layers.

---

## AI Engineering Philosophy

AI systems must:

- Preserve uncertainty
- Expose confidence
- Support correction
- Preserve provenance
- Never fabricate inventory

AI should feel **assistive, operational, calm, trustworthy** — not magical, autonomous, or overly conversational.

---

## Long-Term Product Direction

The strongest version of SmartOrder becomes an **operational memory layer for physical inventory systems**.

It remembers:

- Inventory
- Scans
- Backroom state
- Historical stock
- Ordering patterns
- OCR knowledge
- Workflow history
- Operational anomalies

The product advantage is not generic AI. The advantage is **structured operational memory.**

---

## Final Engineering Directive

Optimize for: **clarity, modularity, maintainability, operational speed, workflow simplicity.**

Every engineering decision should reduce:

- Cognitive load
- Workflow friction
- Operational complexity
- Architectural entropy

The system should feel enterprise-grade, warehouse-friendly, and calm under operational stress.
