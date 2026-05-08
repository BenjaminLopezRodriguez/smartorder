# SmartOrder — Design System

## Purpose

Defines the visual design language for SmartOrder. This is not an aesthetic guide — it is an operational design system built for warehouse environments. Every design decision serves readability, speed, and one-handed use. AI agents and engineers must follow these rules for every new component.

---

## Responsibilities

- Define the color palette, typography, and spacing system
- Document ShadCN component usage conventions
- Establish the visual language for operational states
- Prevent consumer/social design patterns from entering the product

---

## Design Principles

1. **Clarity over elegance** — if in doubt, add more contrast, not less
2. **Density with breathing room** — pack information, but not at the expense of tap targets
3. **Industrial, not sterile** — functional and purposeful, not cold or clinical
4. **No decorative chrome** — no gradients, shadows, or animations that don't communicate meaning
5. **Status is always visible** — the user always knows where they are in a workflow

---

## Color System

SmartOrder uses a neutral-first, utility-first color system. All colors are defined via CSS custom properties in `src/styles/globals.css` and follow the ShadCN/Tailwind convention.

### Semantic color roles

| Role | Token | Use case |
|---|---|---|
| Primary action | `--primary` | Main CTAs, active scan button |
| Destructive | `--destructive` | Delete, remove, clear |
| Success / done | `green-600` | Completed items, confirmed scans |
| Warning / review | `amber-600` | Low-confidence AI items, pending review |
| Muted / secondary | `--muted-foreground` | Metadata, captions, disabled states |
| Background | `--background` | Page backgrounds |
| Card | `--card` | Content surfaces |
| Border | `--border` | Separators, input outlines |

### Color usage rules

- NEVER use color as the only indicator of status (always pair with text or icon)
- Minimum contrast ratio: **4.5:1** for body text, **3:1** for large text (WCAG AA)
- Avoid red/green-only distinction — colorblind users must be able to distinguish states
- No gradient backgrounds on content cards
- No drop shadows on cards in the scan session interface (they create visual noise)

### Forbidden color patterns
```tsx
// FORBIDDEN: gradient backgrounds
className="bg-gradient-to-r from-blue-500 to-purple-600"

// FORBIDDEN: semi-transparent backgrounds in operational UI
className="bg-white/20 backdrop-blur-sm"

// FORBIDDEN: multiple accent colors on one screen
// Stick to one accent per screen context
```

---

## Typography

SmartOrder uses the system sans-serif stack (via Tailwind default) for body text. No custom fonts are loaded — this improves performance and eliminates layout shift.

### Type scale

| Role | Class | Size | Weight | Use case |
|---|---|---|---|---|
| Scan item name | `text-2xl font-semibold` | 24px | 600 | Current scan item, primary inventory name |
| Page title | `text-xl font-semibold` | 20px | 600 | Page headers |
| Section header | `text-base font-medium` | 16px | 500 | Section titles, card headers |
| Body | `text-sm` | 14px | 400 | List items, descriptions, form labels |
| Caption / meta | `text-xs text-muted-foreground` | 12px | 400 | Timestamps, count summaries, vendor names |
| Number / quantity | `text-2xl font-mono` | 24px | 400 | Quantity fields, counts |

### Typography rules

- Use `font-mono` for all quantity fields and barcode display
- Use `font-semibold` for item names (primary catalog/scan context)
- Never use `font-bold` (700) in operational data displays — it feels alarming
- Line height: use `leading-tight` for compact lists, `leading-normal` for body
- Letter spacing: default for all sizes — no custom tracking
- Truncate long strings: use `truncate` class with `title` attribute for full text

---

## Spacing System

Tailwind's default spacing scale is used. Key values for SmartOrder:

| Token | px | Use case |
|---|---|---|
| `p-3` / `gap-3` | 12px | Internal card padding (minimum) |
| `p-4` / `gap-4` | 16px | Standard component padding |
| `p-6` / `gap-6` | 24px | Page section spacing |
| `space-y-2` | 8px | Between items in a list |
| `space-y-4` | 16px | Between sections |

### Spacing rules

- No content within 16px of screen edges (use `px-4` on page containers)
- Card internal padding: minimum `p-3` (12px)
- Between cards in a list: `gap-3` (12px) minimum
- Icon-to-text gap: `gap-2` (8px)
- Section headers have `mb-3` above their first item

---

## Component Standards

### Buttons

Use ShadCN `Button` with these variants:

| Variant | Use case |
|---|---|
| `default` | Primary action (1 per screen) |
| `outline` | Secondary / adjacent actions |
| `ghost` | Tertiary, icon buttons, nav items |
| `destructive` | Delete, remove — only for explicit destructive actions |

```tsx
// Primary scan action
<Button size="lg" className="w-full min-h-[56px]">
  Mark Scanned
</Button>

// Secondary action
<Button variant="outline" size="sm">
  Skip Item
</Button>

// Destructive action (never in scan flow)
<Button variant="destructive" size="sm">
  Remove from List
</Button>
```

**Size rules:**
- Scan session primary: `size="lg"` + `w-full` + `min-h-[56px]`
- List item actions: `size="sm"`
- Icon buttons: `size="icon"` (always pair with `aria-label`)

### Inputs

```tsx
// Standard search input
<Input
  type="search"
  placeholder="Search catalog..."
  className="h-10"
/>

// Quantity input (always numeric)
<Input
  type="number"
  inputMode="numeric"
  pattern="[0-9]*"
  className="text-center text-xl font-mono h-12 w-20"
/>
```

### Cards

```tsx
// Standard list card
<Card className="p-4">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <p className="font-medium text-sm truncate">{item.name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{item.vendor}</p>
    </div>
    <Badge variant="outline">{item.unitType}</Badge>
  </div>
</Card>
```

### Badges

| Use case | Variant | Color override |
|---|---|---|
| Item category | `outline` | None |
| Unit type (case/unit) | `secondary` | None |
| AI review needed | `outline` | `text-amber-600 border-amber-300` |
| Completed | `secondary` | `text-green-600` |
| Draft list | `outline` | None |
| Active scan session | `default` | None |

### Empty States

Every empty state must include a next action:

```tsx
// From src/components/ui/empty-state.tsx
<EmptyState
  icon={<PackageIcon />}
  title="No catalog items yet"
  description="Import an order guide or add items manually to build your catalog."
  action={<Button>Import Order Guide</Button>}
/>
```

### Page Headers

```tsx
// Standard page header
<PageHeader
  title="Order Lists"
  description="Manage your order-prep sessions"
  action={<Button>New List</Button>}
/>
```

---

## Icon Standards

Use `lucide-react` exclusively. Do not install other icon libraries.

| Icon name | Use |
|---|---|
| `Package` | Catalog / inventory items |
| `ClipboardList` | Lists |
| `Camera` | BackroomVision / capture |
| `ScanLine` | Scan session |
| `Search` | Search |
| `Plus` | Add action |
| `Check` | Complete / confirmed |
| `AlertTriangle` | Warning / review needed |
| `Trash2` | Delete (always `destructive` variant) |
| `Download` | Export |
| `Upload` | Import |

Icon sizing:
- Nav icons: `h-5 w-5`
- Button icons (alongside text): `h-4 w-4 mr-2`
- Empty state illustrations: `h-10 w-10 text-muted-foreground`

---

## Layout Patterns

### Mobile (< 768px)
- Bottom navigation bar (always visible, thumb-reachable)
- Full-width content (no sidebars)
- Cards stack vertically

### Desktop (≥ 768px)
- Left sidebar navigation
- Content area with max-width `max-w-2xl` for operational screens
- `max-w-4xl` for catalog browse screens

### Scan Session (any screen size)
- Full-screen interface
- Item name at top third of screen
- Quantity stepper centered
- Primary action at bottom (within thumb reach)
- Minimal chrome — hide nav during active session

---

## Anti-patterns

- Gradients on any content surface
- Box shadows on scan session cards
- More than 2 typefaces (zero custom fonts — system stack only)
- Emoji in operational UI (except explicit user-generated content)
- Card hover effects on mobile (touch devices don't hover)
- `text-primary` on non-interactive text (reserved for links/actions)
- Font sizes below `text-xs` (12px) for any user-visible text
- Color-only status indicators

---

## Rules

1. New components must use existing ShadCN primitives before custom implementations
2. New colors must use CSS custom properties — no hex values in component files
3. All interactive elements include a focus ring (ShadCN handles this automatically)
4. The design system extends via `globals.css` — never add global styles anywhere else
5. Component-level Tailwind classes are acceptable; no inline `style` props

---

## AI-Agent Instructions

When building UI components:
1. Check `src/components/ui/` before creating a new primitive
2. Use the type scale and spacing values defined above — do not invent sizes
3. Touch targets must be ≥ 48px — add explicit `min-h-[48px]` if ShadCN default is smaller
4. Never add animations longer than 150ms to operational screens
5. Icon sizing must match the standards table above
6. Quantity fields always use `font-mono` and `inputMode="numeric"`

---

## Production Considerations

- System font stack eliminates font-load CLS (Cumulative Layout Shift)
- Avoid `text-sm` below on mobile — text below 14px is unreadable in warehouse lighting
- Test color contrast in both light and dark mode
- Validate that `inputMode="numeric"` triggers numeric keyboard on iOS Safari and Android Chrome
