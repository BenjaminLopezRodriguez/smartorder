# SmartOrder — Operational UX Rules

## Purpose

This document defines the UX law for SmartOrder. Every screen, component, and interaction pattern must comply with these rules. These are not suggestions — they are requirements that prevent the app from feeling like consumer software instead of operational tooling.

---

## Responsibilities

- Enforce operational UX patterns across all UI work
- Define interaction standards for warehouse use cases
- Set the bar for speed, clarity, and one-handed usability
- Prevent consumer/social UX patterns from entering the product

---

## Core UX Principle

> **Every interaction must be faster and less error-prone than a clipboard and pencil.**

If a feature doesn't meet this bar, it should be cut, simplified, or redesigned.

---

## The 5 Operational UX Laws

### Law 1: One Primary Action Per Screen

Every screen has exactly one obvious next action. Secondary actions are secondary — visually and spatially.

```
✅ Good:
  [Scan Next Item]  ← full-width, bottom of screen, 56px tall
  (skip) (adjust qty)  ← small, above the primary

❌ Bad:
  [Scan] [Skip] [Edit Item] [View Details] [Export]  ← four equal-weight actions
```

### Law 2: Touch Targets Are Never Smaller Than 48×48px

No exceptions. On mobile, the minimum is 48px. For primary actions in scan sessions: 56px minimum height.

```typescript
// Every interactive element
className="min-h-[48px] min-w-[48px]"

// Primary scan session action
className="min-h-[56px] w-full"
```

### Law 3: Feedback Within 100ms

Every tap must produce visual feedback within 100ms. If the operation takes longer, show a loading state immediately.

```typescript
// Correct: optimistic update + tRPC mutation
const updateScanned = api.lists.updateScannedCount.useMutation({
  onMutate: async (variables) => {
    // immediately update local state
  },
});
```

### Law 4: No Scroll to Complete a Task

The critical information for completing a scan step fits on one screen without scrolling. If it doesn't, the design is wrong.

### Law 5: Labels Over Icons (Always)

Icons are decorative. Labels are functional. In an operational context, a worker should never have to guess what a button does.

```
✅ Good: [+ Add to List]
❌ Bad: [+] (with tooltip)

✅ Good: [Mark Complete]
❌ Bad: [✓]
```

---

## Interaction Patterns

### Quantity Entry

- Default to number pad, not QWERTY keyboard
- Show `+` and `−` stepper buttons alongside the input
- Accept scan events to auto-increment (no tap required)
- Max digits: 3 (nobody scans 1000 cases)

```tsx
// Preferred pattern for quantity entry
<div className="flex items-center gap-3">
  <Button variant="outline" size="lg" onClick={() => decrement()}>−</Button>
  <Input
    type="number"
    inputMode="numeric"
    pattern="[0-9]*"
    className="text-center text-2xl font-mono w-20"
    value={qty}
    onChange={...}
  />
  <Button variant="outline" size="lg" onClick={() => increment()}>+</Button>
</div>
```

### List Navigation

- Swipe right = mark done / advance (scan session)
- Swipe left = skip / defer
- No swipe for destructive actions — require explicit button
- Current item always at top third of screen (not center — eye position in handheld use)

### Search

- Search triggers on keystroke (debounced 150ms)
- Show results inline, not in a modal
- First result auto-highlighted (Enter/scan confirms)
- Show item count alongside results (e.g., "12 items")
- Empty state shows category filters, not a blank screen

### Confirmations

- Destructive confirmations: inline reveal, not modal
- Completing a list: single tap → "✓ List complete" banner → export options
- Deleting an item: tap trash → item grays out with [Undo] for 4 seconds → then deletes
- Never show a "Are you sure?" modal dialog in a scan session context

---

## Visual Hierarchy Rules

### Typography scale in use
```
Display (scan item name):     text-2xl font-semibold  (24px)
Section header:               text-base font-medium    (16px)
Body / list item:             text-sm                  (14px)
Caption / metadata:           text-xs text-muted       (12px)
```

### Color semantics
```
Primary action:          Default button variant (high contrast)
Scan-ready state:        Green accent (#16a34a or equivalent)
Warning / low confidence: Amber accent
Error / missing:         Red accent
Completed items:         Muted / strike-through
Neutral actions:         Outline variant
```

### Density
- List rows: minimum 56px tall on mobile
- Cards: 12px internal padding minimum
- Section gaps: 16px between sections
- No content touches screen edges — 16px minimum horizontal margin

---

## Anti-patterns

These patterns are explicitly forbidden in SmartOrder:

| Anti-pattern | Why forbidden |
|---|---|
| Skeleton loaders that flash repeatedly | Distracting in warehouse conditions |
| Toast notifications for scan events | They cover the scan interface |
| Parallax or scroll animations | Performance + motion sickness in motion |
| Bottom sheets for every action | Adds a navigation step |
| Infinite scroll in catalog lists | Workers need to see quantity, not infinite browse |
| Full-screen takeovers for settings | Breaks the workflow context |
| Tooltips as primary affordance | Requires press-and-hold, breaks gloved use |
| Tab bars with more than 5 items | Cognitive overload |
| Progress bars for under-2-second operations | Creates false urgency |
| Gradient backgrounds | Reduces text contrast, looks consumer |
| Rounded corners > 8px on data cards | Makes it look like a social app |

---

## Rules

1. The scan session interface must work with one hand, with a glove on
2. Color is never the only indicator of status (always pair with text or icon)
3. Loading states must not shift layout (use skeleton shapes that match content)
4. Empty states always include the next action (not just "No items found")
5. Error states always include a recovery action (not just "Something went wrong")
6. Every form has a visible submit button (no keyboard-only submit)
7. Number inputs always open the numeric keypad (`inputMode="numeric"`)
8. Session state survives app backgrounding (Zustand persist or server sync)

---

## Examples

**Scan session item card (correct)**:
```
┌─────────────────────────────────┐
│ ITEM 3 OF 12                    │  ← small, muted
│                                 │
│  WHOLE MILK 1GAL                │  ← 24px, semibold
│  Dean's / Case of 4             │  ← 14px, muted
│                                 │
│  ┌───┐  [  3  ]  ┌───┐         │  ← qty stepper
│  │ − │           │ + │         │
│  └───┘           └───┘         │
│                                 │
│      [Mark Scanned ✓]           │  ← 56px, primary, full-width
│                                 │
│      skip ›                     │  ← 14px, muted, below
└─────────────────────────────────┘
```

**Empty catalog state (correct)**:
```
┌─────────────────────────────────┐
│                                 │
│     No catalog items yet        │  ← clear label
│  Import an order guide to       │  ← actionable description
│  build your catalog.            │
│                                 │
│  [Import Order Guide]           │  ← primary action
│  [Add Item Manually]            │  ← secondary action
│                                 │
└─────────────────────────────────┘
```

---

## Implementation Guidance

- Add `touch-manipulation` to all interactive elements to prevent 300ms delay
- Use CSS `will-change: transform` sparingly and only on animated elements
- Prefer `transform` and `opacity` for animations over `height`/`width` (performance)
- Set `tap-highlight-color: transparent` on interactive elements (custom highlight instead)
- Use `pointer-coarse` media query to adjust touch target sizes on mobile devices

---

## UX Guidance for Specific Screens

| Screen | Primary action | Max secondary actions |
|---|---|---|
| Dashboard | Start scan session | 3 |
| Catalog search | Add to list | 2 |
| List detail | Start scan session | 2 |
| Active scan | Mark scanned | 2 |
| BackroomVision | Capture photo | 2 |
| Export/review | Share / export | 2 |

---

## AI-Agent Instructions

When building or modifying UI:
1. Before adding an interaction, ask "does this serve the scan session workflow?"
2. Touch target sizes are NON-NEGOTIABLE — add `min-h-[48px]` to all clickable elements
3. Never use a modal for inline status updates (use inline state transitions)
4. Favor text labels over icon-only buttons for every primary and secondary action
5. Animations above 150ms require explicit justification — default is no animation
6. Test every screen layout at 375px width first

---

## Production Considerations

- Touch target compliance should be part of PR review checklist
- Run Lighthouse accessibility audit before shipping any new screen
- Test scan session UI on actual mobile devices (not just browser devtools simulation)
- Validate that number inputs open numeric keypad on iOS and Android
- Performance: scan session transitions must not trigger full re-renders
