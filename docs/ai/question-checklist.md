# SmartOrder — Agent Question Checklist (Better Decisions)

Use this doc **before** writing code. It’s a shared checklist for you + any coding agent (Claude, GPT, etc.) to ask the *minimum* important questions, avoid ambiguity, and keep decisions aligned with SmartOrder’s architecture and simplified MVP.

Related docs:
- `docs/architecture/overview.md` (architecture rules — must follow)
- `docs/simplify-product.md` (scope guardrails — keep core loop)

---

## 0) “Are we in discovery or build mode?”

If **>30%** of the items below are unknown/guessed, stop building and do discovery first.

- Do we know the **exact user role** and the environment constraints (noise, gloves, one-handed use, Zebra present)?
- Do we know the **current workflow** they use today (paper, spreadsheets, ERP export, etc.)?
- Do we know the **one core loop** we’re shipping and how we’ll measure success?

If not: write down assumptions, run a small test, then build.

---

## 1) One-sentence product definition (required)

Fill this in before building a feature:

> **For** \[specific user\], SmartOrder helps \[specific outcome\] by \[one primary workflow\].

If you can’t state it in one sentence, the scope is too big.

---

## 2) Core-loop scope filter (MVP guardrail)

Every requested feature must be bucketed:

- **MVP**: required to complete the loop end-to-end (catalog → list → scan → review/export).
- **Post-launch**: improves speed/quality but not required to learn.
- **Not now**: adds automation/ML risk, multiplies screens, or needs complex ops.

If a feature doesn’t shorten **time to complete a list** or reduce **scan/review errors**, it’s probably not MVP.

---

## 3) Product questions to ask (always)

### User + context
- Who is the primary user (role/title)? Who is secondary?
- Where is this used (backroom, aisle, receiving dock)? Any connectivity constraints?
- What hardware is present (Zebra model, printer, tablets, laptops)?

### Job-to-be-done (JTBD)
- What is the user trying to accomplish *today*, without SmartOrder?
- What is the most painful step (time, errors, cognitive load)?
- What does “done” look like (export format, order placed, handoff to another person)?

### Success + metrics
- What metric are we optimizing first?
  - Time to build a list
  - Time per scanned item
  - # edits during review
  - Export usage rate
  - Weekly repeat usage

### Non-goals (explicit)
- What must **not** be included in this iteration?
- What do we defer even if it’s “cool” (voice, OCR AI parsing, scan detection automation, CV overlays)?

---

## 4) Engineering questions to ask (always)

### Data + persistence
- What data must persist? What can be ephemeral?
- What are the minimum tables/fields needed (avoid schema bloat)?
- Do we need **preview vs production** separation (DB, storage)?

### API + boundaries (architecture rules)
Confirm we follow:
- No DB access from React components — **all DB through tRPC**.
- Page/layout files are thin — no business logic there.
- Business logic belongs in `src/lib/*` and is unit-testable.

### Failure modes
- What happens if the DB is down?
- What happens if a mutation fails mid-scan?
- What does the UI show when data is empty/loading/error?

### Performance
- What is the expected data volume (catalog size, lists per week)?
- Do we need pagination now, or later?

### Security + auth
- Is this feature protected? (Architecture says **routes are protected by default**.)
- What user boundary exists (single workspace vs multi-org)?

---

## 5) Environment variables checklist (ask early)

Ask the user for these **before** implementing deployment-sensitive work.

### Required (current app)
- `DATABASE_URL` (Postgres connection string)

### Optional / future integrations (only ask when implementing)
- Storage (e.g. Vercel Blob): credentials/config as required by the chosen provider
- OCR provider (Textract): AWS keys/role + bucket/region details
- AI provider (OpenAI): API key + model choices + budget limits

Also ask:
- Where is Postgres hosted (Neon / Supabase / RDS / local)?
- Do you want separate DBs for **preview** vs **production**?

---

## 6) “Stop and clarify” triggers (hard rules)

Stop building and ask clarifying questions if:
- The request changes the **core loop** or adds a second loop.
- The feature implies **automation/ML** (OCR parsing, scan detection, CV) without an explicit “manual-first” fallback.
- It adds **new external services** (S3, Textract, OpenAI, Blob) without keys/budget/error policy.
- It adds **multi-tenant/org** complexity before single-workspace MVP is validated.
- It requires storing files in DB (forbidden) instead of blob storage + URL reference.

---

## 7) Decision templates (copy/paste)

### A) Feature decision (fast)
- **User**:
- **Job**:
- **Core loop step impacted**:
- **MVP/Post-launch/Not now**:
- **What we’ll ship this week**:
- **What we’re explicitly deferring**:
- **How we’ll measure success**:

### B) Technical decision (ADR-lite)
- **Decision**:
- **Options considered**:
- **Chosen option & why**:
- **Trade-offs**:
- **Rollout plan**:
- **Failure modes & mitigations**:

---

## 8) Practical “agent prompt” starter

When asking an agent to implement something, provide:

- Goal in one sentence (user + outcome)
- Must-follow docs: `docs/architecture/overview.md`, `docs/simplify-product.md`
- Constraints (no OCR/voice/automation unless requested)
- Data requirements (tables, fields, persistence)
- Acceptance criteria (what pages/routes work, what commands must pass: `pnpm lint`, `pnpm typecheck`, `pnpm build`)

