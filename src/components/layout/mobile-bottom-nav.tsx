"use client";

import { usePathname } from "next/navigation";

import { getMobileNav, isNavActive } from "~/lib/nav";

import { BottomNavItem } from "./nav-item";

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = getMobileNav();

  return (
    <nav
      aria-label="Primary"
      className="bg-surface/95 border-border fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch">
        {items.map((item) => (
          <li key={item.id} className="flex flex-1">
            <BottomNavItem
              icon={item.icon}
              label={item.shortLabel ?? item.label}
              href={item.href}
              active={isNavActive(pathname, item.href)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
