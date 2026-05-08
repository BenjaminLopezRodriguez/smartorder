# SmartOrder — Product Philosophy

## Purpose

This document defines the product philosophy for SmartOrder. It is the ground truth for all product decisions, feature prioritization, and design tradeoffs. Every AI agent, engineer, and designer working on this product should internalize this document before building anything.

---

## Responsibilities

- Define what SmartOrder is and is not
- Anchor feature decisions to the core workflow
- Prevent scope creep and product drift
- Set the bar for user experience quality

---

## What SmartOrder Is

SmartOrder is an **operational companion for warehouse and backroom workers** who prep orders against paper or PDF order guides.

It solves a specific, real problem: a backroom worker has a paper order guide, a Zebra scanner, and needs to count and record how many cases of each item they have on hand. This is tedious, error-prone, and produces inconsistent output.

SmartOrder replaces the clipboard. It does not replace the Zebra scanner, the warehouse management system, or the receiving dock process.

### Core value propositions (ranked)
1. **Speed** — complete an order-prep session faster than paper
2. **Accuracy** — reduce miscounts and transposition errors
3. **Consistency** — every session produces a structured, exportable output
4. **Recall** — searchable inventory memory across sessions
5. **Visibility** — shared backroom state via BackroomVision

---

## What SmartOrder Is NOT

This is equally important. These are hard product boundaries:

| Not this | Why |
|---|---|
| A POS system | Completely different workflow and user |
| A procurement platform | We assist prep, not purchasing decisions |
| A receiving system | Exists downstream of our workflow |
| Consumer shopping software | Wrong UX model entirely |
| A replacement for Zebra scanners | We work alongside them |
| A general WMS | Too broad; we are a focused companion tool |
| A real-time inventory system | We capture snapshots at prep time, not live stock |

If a proposed feature doesn't serve the order-prep workflow, it does not belong in this product.

---

## Target User

**Primary**: Backroom lead or stock associate at a grocery/retail/foodservice location.

| Attribute | Reality |
|---|---|
| Device | iPhone (personal) or shared iPad |
| Environment | Warehouse, backroom, cooler, receiving area |
| Physical conditions | May be wearing gloves; poor lighting; loud |
| Time pressure | Working against a delivery window |
| Tech comfort | Functional, not tech-savvy |
| Session length | 15–90 minutes of active scanning |
| Frustration tolerance | Low — every extra tap is friction |

**Secondary**: Store manager reviewing prep output and ordering patterns.

---

## Core Loop (Must Never Break)

```
Order guide (PDF/photo)
       ↓
  OCR + AI parse
       ↓
  Structured catalog
       ↓
  Build order-prep list
  (voice / search / camera)
       ↓
  Guided scan session
  (item-by-item, count cases/units)
       ↓
  Review quantities
       ↓
  Export / share final list
```

Every feature must serve at least one step in this loop. Features that exist outside the loop are distractions.

---

## Constraints

1. **The user is in motion** — they cannot read dense text while walking
2. **The screen may be wet, grimy, or viewed at an angle**
3. **The session may be interrupted** — state must survive background/foreground
4. **Connectivity may be spotty** — offline-capable scan sessions are critical
5. **The worker is time-pressured** — every second of confusion has a cost
6. **The data is consequential** — wrong quantities mean wrong orders, which means stockouts or waste

---

## Anti-patterns (product-level)

- **Feature bloat**: adding features that feel cool but don't accelerate the core loop
- **Consumer UX**: smooth animations, social patterns, engagement-maximizing design
- **AI overreach**: auto-applying AI suggestions to consequential inventory data without human review
- **Session complexity**: more than 3 interactions per scan step
- **Modal hell**: confirmations or wizards that block the scan flow
- **Precision theater**: showing decimal quantities or sub-unit counts that workers don't use

---

## Rules

1. Every screen must have an obvious primary action (what do I do next?)
2. No feature ships without a "what does the worker do with this?" answer
3. AI-powered features always show confidence and always allow manual override
4. Session state (scan progress) must be recoverable after an unexpected close
5. Export output must be printable, shareable via SMS/email, and readable without the app
6. The catalog is the source of truth — list items always reference catalog items, never free-form strings

---

## Examples

**Good feature**: "Voice search while scanning" — hands-free, accelerates lookup in the middle of a session.

**Bad feature**: "Inventory trend charts" — interesting data, but no worker acts on it during order prep.

**Good feature**: "Low-confidence OCR items flagged for review" — keeps data honest, user stays in control.

**Bad feature**: "AI auto-populates quantities based on historical data" — too much AI autonomy for consequential data.

**Good feature**: "Export list as CSV or printable HTML" — the output leaves the app.

**Bad feature**: "Social sharing of inventory snapshots" — wrong audience, wrong use case.

---

## Implementation Guidance

When implementing any feature:
1. Ask: "Which step in the core loop does this accelerate?"
2. Ask: "What does the worker physically do to trigger this?"
3. Ask: "What happens if this fails silently?"
4. Ask: "Can a worker with gloves on use this?"
5. Ask: "Does this work when connectivity drops?"

If you cannot answer all five, the feature is not ready to implement.

---

## UX Guidance

The visual language of SmartOrder should feel like:
- An industrial dashboard, not a consumer app
- Calm and clear, not exciting and animated
- Information-dense but never cluttered
- Professional, not playful

Reference mental model: **the Zebra handheld device UI** — functional, direct, no unnecessary chrome.

---

## AI-Agent Instructions

When building new features for SmartOrder:
1. Verify the feature maps to a step in the core loop before writing code
2. Do not add features that exist outside the documented product boundary
3. Always treat inventory data as consequential — never guess, always confirm
4. Surface uncertainty rather than hiding it
5. Prefer fewer, more reliable features over many fragile ones
6. The `docs/simplify-product.md` file contains explicit MVP scope guidance — follow it

---

## Production Considerations

- The product must work in environments with 2G/3G connectivity
- Session state must use local persistence (localStorage + server sync) as a resilience layer
- OCR and AI calls must be async with clear progress indicators — never block the UI
- The export feature is mission-critical: if nothing else works, the worker must be able to export a list
- BackroomVision storage costs scale with snapshot volume — implement retention policies from day one
