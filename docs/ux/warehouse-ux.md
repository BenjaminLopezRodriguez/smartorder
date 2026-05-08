# SmartOrder — Warehouse UX Behavior

## Purpose

This document defines UX rules specific to warehouse and backroom environments. The physical context of SmartOrder's users is fundamentally different from a typical consumer app user — and the UX must reflect that reality. These rules address gloved interaction, lighting, motion, interruption, and device handling.

---

## Responsibilities

- Define environment-specific interaction requirements
- Set standards for readability under adverse lighting
- Establish resilience patterns for interrupted sessions
- Define one-handed use patterns for device handling during scanning

---

## The Warehouse Environment Reality

| Condition | Impact on UX |
|---|---|
| Nitrile or latex gloves | Reduced touch sensitivity; requires larger targets |
| Fluorescent or LED warehouse lighting | Reflective screen glare; wash-out on low-contrast UI |
| Cooler / freezer environments | Condensation on screen; cold fingers reduce precision |
| Loud ambient noise | Audio feedback unreliable; visual-only feedback critical |
| One hand occupied with scanner/cases | One-handed device operation required |
| Time pressure | Every wasted second matters; zero tolerance for confusion |
| Shared devices | No assumptions about persistent login state or personalization |
| Intermittent Wi-Fi | Session must not lose state on connectivity drop |
| Motion (walking, bending) | Screen stability; avoid motion-triggered interactions |

---

## Touch Interaction Standards

### Gloved touch targets

Standard 44px targets are too small for gloved hands. SmartOrder minimums:

| Context | Minimum target | Notes |
|---|---|---|
| Scan session primary button | 56 × full-width | Most important interaction |
| Quantity stepper (+ / −) | 48 × 48px | Finger-width minimum |
| List item taps | 56px height | Full-row tap area |
| Navigation tabs | 56px height | Thumb reach |
| Form inputs | 44px height | Standard minimum |
| Icon-only buttons | 48 × 48px | Always |

```tsx
// Glove-safe quantity stepper
<div className="flex items-center gap-4">
  <button
    className="min-h-[48px] min-w-[48px] rounded-md border flex items-center justify-center text-xl"
    onClick={decrement}
    aria-label="Decrease quantity"
  >
    −
  </button>
  <input
    type="number"
    inputMode="numeric"
    className="h-12 w-24 text-center text-2xl font-mono border rounded-md"
  />
  <button
    className="min-h-[48px] min-w-[48px] rounded-md border flex items-center justify-center text-xl"
    onClick={increment}
    aria-label="Increase quantity"
  >
    +
  </button>
</div>
```

### Tap vs. swipe gestures

- Primary actions: **taps only** (swipe gestures are unreliable with gloves)
- Swipe-to-advance: only in scan session, only as an ACCELERATOR (tap alternative always available)
- No multi-finger gestures
- No double-tap to activate (too unreliable)
- No long-press for primary actions

---

## Lighting and Contrast

### Minimum contrast requirements

SmartOrder targets warehouse environments with high ambient light and potential direct overhead illumination on the screen.

| Element | Minimum contrast ratio |
|---|---|
| Body text | 5.5:1 (exceeds WCAG AA) |
| Large headings | 4.5:1 |
| Placeholder text | 3.5:1 |
| Disabled elements | 2.5:1 (exempted from WCAG normal rules) |
| Status badges | 4.5:1 for text within badge |

### Brightness considerations

- Avoid pure white (`#ffffff`) backgrounds in high-brightness environments — slightly off-white (`oklch(0.98 ...)`) reduces glare
- Dark mode should be available and should be the default option for freezer environments
- Maximum scan session card background brightness: `bg-card` (never `bg-white` inline)

### Text size floors

No operational text below 14px (`text-sm`). In scan session active view: no text below 16px for item information.

---

## One-Handed Use

The dominant hand holds a Zebra scanner or a box/tote. The non-dominant hand holds the phone.

### Thumb-reachable zones on mobile

```
┌──────────────────┐
│ ●  DIFFICULT     │  Header area — status info only, no actions
│    REACH         │
├──────────────────┤
│                  │  Middle zone — content display
│    CONTENT       │
│    DISPLAY       │
├──────────────────┤
│ ●  EASY REACH    │  Bottom 40% — all primary actions here
│    (thumb)       │
└──────────────────┘
```

Rules:
- Primary scan actions: bottom 40% of screen
- Navigation: bottom nav bar
- Critical info (item name, quantity): vertical center
- Settings / exit actions: top (deliberately hard to reach accidentally)

### One-handed scrolling

- Long lists in scan session context are an anti-pattern — use pagination over scrolling
- If scroll is unavoidable: sticky action button at bottom (always visible without scrolling)
- Never put the "Mark Scanned" button above the fold

---

## Session Resilience

The scan session is the highest-stakes screen. Interruptions are common: phone call, app switch, device sleep, connectivity drop.

### Required resilience behaviors

1. **Persist scan progress**: Zustand + `persist` middleware → localStorage
2. **Optimistic mutation**: local count update immediately, server sync deferred (debounced 2s)
3. **Re-entry detection**: on app open, if an active session exists, show "Resume session" prompt
4. **Connectivity indicator**: show offline badge when navigator.onLine is false
5. **Partial sync on reconnect**: when connectivity restores, sync pending updates automatically
6. **No data loss on crash**: all scan counts persisted before server confirmation

```typescript
// Scan store with persistence
export const useScanStore = create<ScanState & ScanActions>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: "smartorder-scan-session",
      // Only persist the critical session data
      partialize: (state) => ({
        activeListId: state.activeListId,
        currentItemIndex: state.currentItemIndex,
        scannedCounts: state.scannedCounts,
        sessionStartedAt: state.sessionStartedAt,
      }),
    }
  )
);
```

### Interrupted session UX
```tsx
// On app open with existing session
{activeScanSession && (
  <div className="fixed bottom-0 inset-x-0 p-4 bg-background border-t z-50">
    <p className="text-sm font-medium">Scan session in progress</p>
    <p className="text-xs text-muted-foreground">
      {activeScanSession.listName} · {activeScanSession.progress}% complete
    </p>
    <div className="flex gap-3 mt-3">
      <Button className="flex-1" onClick={resumeSession}>Resume</Button>
      <Button variant="outline" onClick={abandonSession}>Abandon</Button>
    </div>
  </div>
)}
```

---

## Audio and Haptic Feedback

Warehouse environments are noisy. Audio feedback alone is insufficient.

### Rules
- Audio feedback (scan beep): optional, off by default
- Haptic feedback: use `navigator.vibrate(50)` on successful scan (short pulse)
- Never rely on audio feedback as the only scan confirmation signal
- Visual scan confirmation: immediate, full-screen flash or prominent indicator

```typescript
function onScanConfirmed() {
  // Visual (primary)
  setScanFeedbackVisible(true);
  setTimeout(() => setScanFeedbackVisible(false), 300);

  // Haptic (secondary)
  if ("vibrate" in navigator) {
    navigator.vibrate(50);
  }

  // Audio (optional)
  if (audioFeedbackEnabled) {
    scanBeep.play().catch(() => {}); // never throw on audio failure
  }
}
```

---

## Interruption and Notification Patterns

During a scan session:
- System notifications must not disrupt the interface (this is a browser limitation — inform users to enable Do Not Disturb)
- Toast notifications are BANNED during active scan sessions — they cover the scan interface
- Status updates (item saved, sync complete) go to a persistent status bar at the bottom, not floating toasts

---

## Motion and Stability

Workers move during use — walking, bending, reaching into shelves.

### Rules
- No motion-activated features (accelerometer, gyroscope) for primary actions
- No auto-focus camera trigger based on movement — use explicit tap or scan event
- Disable iOS scroll momentum bounce during scan sessions (it creates disorientation)
- No parallax effects anywhere in the app
- Page transitions: instantaneous or ≤ 100ms fade — no slide transitions during scan

```tsx
// Prevent scroll bounce during scan session
useEffect(() => {
  if (isActiveSession) {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }
}, [isActiveSession]);
```

---

## Anti-patterns

| Anti-pattern | Reason |
|---|---|
| Pull-to-refresh in scan session | Accidental trigger while bending |
| Swipe-only navigation | Unreliable with gloves |
| Haptic as only scan feedback | Not felt through thick gloves |
| Auto-advance on scan without confirmation option | Scanning errors unrecoverable |
| Dark text on dark background | Unreadable in low-light areas |
| Full-screen video or camera preview during list building | Drains battery in long sessions |
| Session that requires constant connectivity | Fails in cooler / dead zones |

---

## Rules

1. Every scan action must have a fallback that works without the scanner (manual count entry)
2. The scan session must resume from exactly where it left off after any interruption
3. Touch targets are never below 48px; scan session primary is never below 56px
4. Contrast must be validated on both light and dark backgrounds
5. No interaction relies on a tooltip, popover, or long-press for discovery

---

## AI-Agent Instructions

When building any component that appears in a scan session:
1. Verify touch targets are ≥ 48px before submitting
2. Add `persist` middleware to any Zustand store that holds session state
3. Prefer visual feedback over audio — always implement visual first
4. Place primary actions in the bottom 40% of the screen layout
5. Test rendering logic for the "session interrupted → resumed" state

---

## Production Considerations

- Test on physical iPhone 12/13/14 (common backroom device) at arm's length
- Validate that `navigator.vibrate` is available (it is not in Safari — fail gracefully)
- Monitor session abandonment rate as a proxy for interruption UX problems
- Persistence key (`smartorder-scan-session`) must not conflict with other localStorage keys
- LocalStorage has a 5MB limit — scan state objects must be compact (IDs + counts only, not full item objects)
