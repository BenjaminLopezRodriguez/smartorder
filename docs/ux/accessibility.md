# SmartOrder — Accessibility Rules

## Purpose

Defines accessibility requirements for SmartOrder. These rules serve multiple constituencies: workers using assistive technology, workers in noisy/bright environments who benefit from high contrast, and warehouse contexts where physical limitations temporarily affect interaction (gloves, one hand occupied).

---

## Responsibilities

- Define WCAG compliance targets
- Specify focus management patterns
- Establish screen reader requirements
- Define keyboard navigation requirements

---

## Compliance Target

SmartOrder targets **WCAG 2.1 Level AA** compliance.

Key requirements at AA:
- Text contrast ≥ 4.5:1 (body text), ≥ 3:1 (large text)
- All interactive elements keyboard-accessible
- All images have text alternatives
- No color-only status indicators
- Focus visible on all interactive elements

---

## Color Contrast

SmartOrder's warehouse environment requires contrast that exceeds standard AA in practice:

| Context | Minimum ratio | Target ratio |
|---|---|---|
| Body text (catalog items, names) | 4.5:1 | 6:1 |
| Large text (scan item name, headings) | 3:1 | 4.5:1 |
| UI components (button borders, input) | 3:1 | 4.5:1 |
| Status badges (text on colored bg) | 4.5:1 | 5:1 |
| Placeholder text | 3:1 | 4:1 |
| Disabled states | 2:1 (exempt) | 2.5:1 |

ShadCN's default theme meets AA requirements. Never override colors without checking contrast.

### Contrast check tool

Use `pnpm contrast-check` (or browser DevTools accessibility panel) to verify contrast before merging UI changes.

---

## Keyboard Navigation

Every interactive element must be keyboard-accessible:

```tsx
// ✅ Correct: focusable, with visible focus ring
<button
  className="focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
  onClick={handleAction}
>
  Mark Scanned
</button>
```

ShadCN components include focus rings by default — do not remove them.

### Tab order

Tab order must match visual reading order (top → bottom, left → right). Use `tabIndex` sparingly; rely on DOM order.

### Keyboard shortcuts in scan session

| Key | Action |
|---|---|
| Space / Enter | Mark scanned |
| Arrow Up | Increment count |
| Arrow Down | Decrement count |
| S | Skip item |
| Escape | Exit session (with confirmation) |

---

## Focus Management

### On modal/sheet open

```typescript
// Focus the first interactive element when a modal opens
useEffect(() => {
  if (isOpen) {
    firstFocusableRef.current?.focus();
  }
}, [isOpen]);
```

### On route navigation

Next.js App Router handles focus restoration on navigation — do not override unless necessary.

### After scan session item advance

After "Mark Scanned" advances to the next item, focus moves to the primary action button:

```typescript
function handleMarkScanned() {
  advanceItem();
  requestAnimationFrame(() => {
    primaryActionRef.current?.focus();
  });
}
```

---

## Screen Reader Requirements

### Live regions for dynamic content

The scan session count changes must be announced:

```tsx
<span aria-live="polite" aria-atomic="true" className="sr-only">
  {currentCount} cases scanned
</span>
```

### Descriptive button labels

```tsx
// ❌ Not descriptive enough
<Button>+</Button>

// ✅ Descriptive
<Button aria-label="Increase quantity">+</Button>
```

### Form labels

```tsx
// ✅ Always associate labels with inputs
<label htmlFor="list-name" className="text-sm font-medium">
  List name
</label>
<Input id="list-name" name="list-name" />
```

### Image alternatives

```tsx
// Backroom snapshots
<img
  src={snapshot.imageUrl}
  alt={`Backroom snapshot of ${snapshot.location}, captured ${formatDate(snapshot.createdAt)}`}
/>

// Decorative icons (paired with text)
<Package aria-hidden="true" className="h-4 w-4" />
<span>Catalog</span>
```

---

## Motion and Animation

### Prefers reduced motion

```tsx
// Always respect reduced motion preference
className="motion-safe:transition-opacity motion-safe:duration-100"

// Or via CSS
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

### The scan count flash animation

The count-flash feedback is important for scan confirmation. For reduced-motion users:
- Replace the opacity flash with an instant badge ("Counted!") that appears for 1 second
- No animation, same informational value

---

## Touch Accessibility

### For motor impairment (beyond glove use)

- All touch targets ≥ 48×48px (warehouse standard is also good for motor accessibility)
- No interactions that require precise targeting
- Swipe gestures: always provide a tap alternative
- Long-press: never required for any primary action

---

## Forms

```tsx
// Required fields
<Input
  required
  aria-required="true"
  aria-invalid={!!error}
  aria-describedby={error ? "name-error" : undefined}
/>
{error && (
  <p id="name-error" role="alert" className="text-xs text-destructive">
    {error}
  </p>
)}
```

- Error messages use `role="alert"` so screen readers announce them immediately
- Required fields marked with `aria-required="true"` (not just visual asterisk)
- Invalid inputs use `aria-invalid="true"`

---

## Anti-patterns

- Removing focus rings (`outline: none` without a replacement)
- Icon-only buttons without `aria-label`
- Color-only status indicators (red/green without text)
- `tabIndex` values > 0 (breaks natural tab order)
- Placeholder text as the only label (disappears on focus)
- Auto-playing media without controls

---

## Rules

1. Every interactive element has a visible focus indicator
2. All images have non-empty `alt` text (or `alt=""` for decorative)
3. Error messages use `role="alert"` or `aria-live`
4. No interaction requires color perception alone
5. All functionality is achievable with keyboard + screen reader

---

## AI-Agent Instructions

When generating UI components:
1. Every `<button>` without visible text needs `aria-label`
2. Every `<input>` needs an associated `<label>` (either visible or `sr-only`)
3. Live regions (`aria-live="polite"`) required for scan session count updates
4. `aria-hidden="true"` on purely decorative icons
5. Do not remove ShadCN's default focus rings

---

## Production Considerations

- Run Axe accessibility audit (via browser extension) before shipping new screens
- Test with VoiceOver (iOS) for the scan session — it's the most important screen
- Verify focus management in scan session item advance on real iOS device
- Check color contrast for both light and dark mode
