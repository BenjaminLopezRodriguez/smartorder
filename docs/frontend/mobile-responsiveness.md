# SmartOrder — Mobile Responsiveness Rules

## Purpose

Defines how SmartOrder adapts to different screen sizes. The primary target is mobile (375px–430px wide iPhones). The secondary target is tablet (768px+). Desktop (1200px+) is a tertiary concern — no worker uses a desktop during order prep.

---

## Viewport Targets

| Breakpoint | Device | Priority |
|---|---|---|
| 375px – 430px | iPhone (primary use) | Critical |
| 430px – 767px | Large phone / small tablet | High |
| 768px – 1024px | iPad / tablet | Medium |
| 1024px+ | Desktop | Low |

Design at 375px first. Expand from there.

---

## Layout System

### Mobile: single-column, bottom navigation

```
┌──────────────────┐
│ Top header       │  ← 48px, title + optional action
├──────────────────┤
│                  │
│ Page content     │  ← scrollable, 16px horizontal padding
│                  │
├──────────────────┤
│ Bottom nav       │  ← 56–64px, always visible
└──────────────────┘
```

### Tablet (768px+): sidebar navigation

```
┌────────┬─────────────────────┐
│ Sidebar│ Page content        │
│  nav   │                     │
│ (fixed)│                     │
└────────┴─────────────────────┘
```

### Implementation

```tsx
// App shell responsive layout
// src/components/layout/app-shell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Sidebar: hidden on mobile, visible md+ */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      {/* Main content: full width on mobile, offset on desktop */}
      <main className="md:pl-64">
        <div className="px-4 pb-20 md:pb-6 pt-4">
          {children}
        </div>
      </main>

      {/* Bottom nav: visible on mobile, hidden md+ */}
      <div className="fixed bottom-0 inset-x-0 md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}
```

---

## Responsive Component Patterns

### Cards: single column on mobile, grid on tablet

```tsx
// Catalog item list
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
  {items.map(item => <CatalogItemCard key={item.id} item={item} />)}
</div>
```

### Scan session: always single column, full screen

The scan session should feel full-screen on all devices:

```tsx
// Full viewport minus the navigation
<div className="fixed inset-0 flex flex-col bg-background md:pl-64">
  <ScanSessionHeader />
  <ScanItemDisplay />
  <ScanControls />
</div>
```

### Tables: never on mobile

Do not use `<table>` elements in the mobile experience. Use card lists instead.

```tsx
// ✅ On mobile: card list
<div className="space-y-2">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>

// ✅ On tablet+: table (optional enhancement)
<div className="hidden md:block">
  <DataTable items={items} />
</div>
```

---

## Typography Responsive Adjustments

```tsx
// Item name: larger on mobile (further viewing distance)
<p className="text-base md:text-sm font-medium">{item.name}</p>

// Page title: adjust scale
<h1 className="text-xl md:text-2xl font-semibold">{title}</h1>

// Scan item name: always large
<p className="text-2xl font-semibold">{currentItem.name}</p>
```

---

## Padding and Spacing

Mobile uses tighter, full-bleed horizontal padding:

```tsx
// Page container
<div className="px-4 md:px-6 lg:px-8">

// Card list
<div className="space-y-2 md:space-y-3">

// Section headers
<h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
```

---

## Bottom Navigation (Mobile)

The bottom nav is 64px tall with 4–5 items:

```tsx
// src/components/layout/mobile-bottom-nav.tsx
const navItems = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Catalog", href: "/search", icon: PackageIcon },
  { label: "Lists", href: "/lists", icon: ClipboardListIcon },
  { label: "Backroom", href: "/backroom", icon: CameraIcon },
];

export function MobileBottomNav() {
  return (
    <nav className="flex h-16 border-t bg-background px-2">
      {navItems.map(item => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}
```

Each nav item: `flex-1`, `min-h-[64px]`, icon + label stacked vertically.

---

## Scroll Behavior

### Mobile scroll rules

- Page content scrolls; nav bars are fixed
- Scan session: no scroll (everything fits one screen)
- Long lists: virtualize if > 100 items

### Safe area insets (iPhone notch / Dynamic Island / home indicator)

```css
/* In globals.css */
body {
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}
```

```tsx
// In Tailwind: use pb-safe (requires tailwindcss-safe-area plugin)
<nav className="pb-safe">
```

---

## Inputs on Mobile

```tsx
// Always specify inputMode for mobile keyboards
<Input type="text" inputMode="text" />          // QWERTY
<Input type="number" inputMode="numeric" />      // Number pad
<Input type="tel" inputMode="tel" />             // Phone keypad
<Input type="search" inputMode="search" />       // Search with "Go" key

// Prevent zoom on input focus (iOS)
// Ensure font-size ≥ 16px on inputs
<Input className="text-base" />  // text-base = 16px, prevents iOS zoom
```

---

## Image Handling on Mobile

```tsx
// Backroom snapshot thumbnail: aspect ratio preserved
<img
  src={snapshot.thumbnailUrl ?? snapshot.imageUrl}
  alt={`Backroom: ${snapshot.location}`}
  className="w-full aspect-[4/3] object-cover rounded-md"
  loading="lazy"
/>
```

---

## Anti-patterns

- Hover-only affordances (mobile has no hover)
- Fixed-width elements on mobile (always use `w-full` or `max-w-*`)
- Text smaller than `text-sm` (14px) in any user-facing context
- Input `font-size` < 16px (triggers iOS zoom)
- Horizontal scroll on page content (only in explicit scroll containers)
- `overflow: hidden` on body during modal (use `overscroll-behavior: contain` instead)

---

## Rules

1. All pages are mobile-first — design at 375px, expand with `md:` prefix
2. No horizontal scrolling on the page level
3. Touch targets are ≥ 48px (enforced via design system)
4. Safe area insets are respected on notched devices
5. Input font size is always ≥ 16px to prevent iOS zoom

---

## AI-Agent Instructions

When generating mobile UI:
1. Default to single-column layouts; use `md:grid-cols-*` for tablet+ grids
2. Bottom navigation is always `md:hidden` — the sidebar is `hidden md:flex`
3. Font size on inputs must be at minimum `text-base` (16px) — use `text-base` class
4. Add `pb-safe` to the bottom nav container for iPhone home indicator
5. Scan session layout is full-viewport (`fixed inset-0`) not normal document flow

---

## Production Considerations

- Test on physical iPhone 12 at a minimum before shipping scan session changes
- Verify safe-area insets on iPhone 14/15 with Dynamic Island
- Use Chrome DevTools mobile simulation for quick checks, but physical device testing before release
- Monitor viewport-specific error rates (if mobile error rate diverges from desktop, investigate)
