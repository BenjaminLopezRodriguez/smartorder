# SmartOrder — Scan Session Flow

## Purpose

Defines the complete state machine, UX flow, and implementation requirements for the guided scan session. The scan session is the most critical feature in SmartOrder — it is the moment of value delivery. Every design and implementation decision for this flow must be optimized for speed, accuracy, and resilience.

---

## Responsibilities

- Define the scan session state machine
- Specify the UX at each state
- Define how scan detection integrates
- Establish resilience and recovery requirements

---

## What a Scan Session Is

A scan session is a guided, one-item-at-a-time workflow where a worker:
1. Looks at the current item shown on screen
2. Physically finds that item in the backroom
3. Counts and/or scans how many cases/units they have
4. Marks it done and moves to the next item
5. Repeats until all items on the list are counted
6. Reviews the final counts and exports

The app's job is to minimize the cognitive load at each step — the worker should never be confused about what to do next.

---

## State Machine

```
IDLE
  │ startSession(listId)
  ▼
LOADING
  │ list loaded with items
  ▼
ITEM_READY (currentIndex = 0)
  │
  ├─ increment count (+/- or scan detection)
  │     └─► COUNT_UPDATED (local only, syncs async)
  │               └─► back to ITEM_READY
  │
  ├─ tap "Mark Scanned"
  │     └─► if hasNextItem → ITEM_READY (currentIndex++)
  │         if lastItem   → REVIEW
  │
  └─ tap "Skip"
        └─► ITEM_READY (currentIndex++, item flagged as skipped)

REVIEW
  │ user reviews all counts (can edit)
  │ tap "Complete Session"
  ▼
SYNCING (final server sync)
  │
  ▼
COMPLETE
  │
  ▼
EXPORT_OPTIONS
```

---

## State Implementation

```typescript
// Zustand scan store states
type ScanSessionStatus =
  | "idle"
  | "loading"
  | "item_ready"
  | "review"
  | "syncing"
  | "complete";
```

Each state maps to a distinct screen layout. No state transitions are implicit — every transition is triggered by an explicit user action or system event (scan detection, all items done).

---

## Screen Layouts by State

### ITEM_READY

```
┌─────────────────────────────────────┐
│ [✕ Exit]           [⋮ Options]     │  ← 44px header
├─────────────────────────────────────┤
│                                     │
│  Item 4 of 12                       │  ← text-xs, muted
│                                     │
│  WHOLE MILK                         │  ← text-2xl, semibold
│  1 GALLON                           │  ← text-xl (continuation)
│  Dean's · 4/CS                      │  ← text-xs, muted
│                                     │
│  ┌──────────────────────────────┐   │
│  │  Target: 6 cases             │   │  ← text-sm, muted
│  │                              │   │
│  │   [−]    [  4  ]    [+]      │   │  ← stepper, 48px min
│  │                              │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │    Mark Scanned ✓            │   │  ← 56px, primary, full-width
│  └──────────────────────────────┘   │
│                                     │
│         skip item ›                 │  ← 14px, muted, below primary
└─────────────────────────────────────┘
```

### REVIEW

```
┌─────────────────────────────────────┐
│ Review Session                      │
│ 12 items · Tap any to edit          │  ← text-xs
├─────────────────────────────────────┤
│ WHOLE MILK 1 GAL     Scanned: 4     │
│ 2% MILK 1 GAL        Scanned: 6     │
│ OJ 64 OZ             Skipped        │  ← skipped items shown
│ EGGS LARGE           Scanned: 12    │
│ ...                                 │
├─────────────────────────────────────┤
│    [Complete & Export]              │  ← 56px, primary
│    [Continue Scanning]              │  ← outline, go back
└─────────────────────────────────────┘
```

---

## Count Entry Mechanics

### Tap +/−
- Immediate Zustand update
- Haptic feedback (50ms vibrate)
- Visual: number flashes briefly (opacity 0 → 1 over 100ms)
- Server sync: debounced 2 seconds

### Scan detection auto-increment
- Scan confidence ≥ threshold → increment count
- Same feedback as manual tap
- No auto-advance to next item (worker may scan multiple cases)

### Manual keyboard entry
- Tap the count field to edit
- Opens numeric keypad
- `max="999"` enforced
- On blur or Enter: commit the value

---

## Skip Behavior

- Skip adds the item to a "skipped" array in the scan store
- The item appears in REVIEW with a "Skipped" badge
- In REVIEW, the worker can go back and scan it
- Skipped items DO NOT get their `scannedCases` updated on completion

---

## Exit and Recovery

### Mid-session exit
- Tap [✕ Exit] → inline confirmation: "Exit session? Progress is saved."
- Two options: "Save & Exit", "Cancel"
- On "Save & Exit": final sync of pending counts, navigate to list detail
- Session can be resumed at any time from the list detail page

### Accidental close (app crash / phone call)
- Scan store is persisted to localStorage
- On next app open: detect `activeListId` in scan store
- Show resume banner: "Scan session in progress — [List name] · 4 items counted"
- Options: "Resume" or "Discard session"

```typescript
// Resume detection hook
export function useResumePrompt() {
  const activeListId = useScanStore(s => s.activeListId);
  const currentIndex = useScanStore(s => s.currentItemIndex);

  if (!activeListId || currentIndex === 0) return null;

  return { listId: activeListId, progress: currentIndex };
}
```

---

## Server Sync Strategy

The scan session uses a local-first approach:

1. Count changes → immediate Zustand update
2. Changed item IDs accumulate in `pendingSyncIds`
3. Debounced effect: sync to server every 2 seconds
4. On session complete: final immediate sync (awaited before navigating away)
5. On reconnect (offline → online): sync all pending IDs

```typescript
// Batch sync mutation
const batchSync = api.lists.batchUpdateScannedCounts.useMutation({
  onSuccess: (_, variables) => {
    markSynced(variables.updates.map(u => u.listItemId));
  },
  onError: () => {
    // Don't lose data — keep in pendingSyncIds, retry next interval
    logger.warn("scan.sync.failed", { pendingCount: pendingSyncIds.length });
  },
});
```

---

## Audio and Haptic Feedback

| Event | Haptic | Visual | Audio (opt-in) |
|---|---|---|---|
| Count increment | 50ms pulse | Count flash | Short beep |
| Mark scanned | 2× 50ms pulse | Green confirmation | Success tone |
| Skip | None | Item grays out | None |
| Session complete | 3× 50ms pulse | Full-screen success | Success tone |
| Scan detection | 50ms pulse | Count flash | Short beep |

---

## Accessibility

- `aria-live="polite"` on the count field (announces changes to screen readers)
- `aria-label="Decrease quantity"` and `aria-label="Increase quantity"` on stepper buttons
- All item text is heading-level accessible
- Skip and exit buttons are keyboard-reachable

---

## Constraints

1. No UI blocking during count increments — all updates are synchronous and local
2. Session state survives any interruption (phone call, app switch, crash)
3. The "Mark Scanned" button is always in the bottom half of the screen
4. Manual entry is always available regardless of scan detection state
5. A session can have at most 500 items (UX ceiling)

---

## Anti-patterns

- Advancing to the next item automatically on scan detection (worker may scan multiple cases)
- Blocking the tap handler on an API call
- Showing a modal during the scan flow
- Not persisting the Zustand store (session lost on app close)
- Toast notifications during the active scan state

---

## Rules

1. The state machine in this document is canonical — the implementation must match it
2. Count increments are always local-first
3. The review screen is not optional — it appears before completion
4. Session sync uses a debounced background effect, not a blocking API call
5. Skipped items are shown in review and can be revisited

---

## AI-Agent Instructions

When implementing the scan session:
1. Follow the state machine exactly — do not add intermediate states without updating this doc
2. The `useScanStore` with `persist` middleware is mandatory — do not use `useState` for session state
3. Server sync is debounced — it must NOT be in the tap handler
4. The "Mark Scanned" button must be `w-full min-h-[56px]` — no exceptions
5. Implement the resume detection hook and show the resume banner on app open

---

## Production Considerations

- Test the full state machine on a real device before shipping
- Verify localStorage persistence survives Safari's aggressive background termination
- Monitor session abandonment rate — high abandonment suggests UX friction
- The `batchUpdateScannedCounts` procedure must handle up to 500 items in one call
- Final sync on completion must be awaited — do not navigate before sync completes
