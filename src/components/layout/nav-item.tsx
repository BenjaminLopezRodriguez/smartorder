"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

interface SidebarNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active: boolean;
  collapsed?: boolean;
}

export function SidebarNavItem({
  icon: Icon,
  label,
  href,
  active,
  collapsed = false,
}: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
        active
          ? "bg-brand-soft text-brand-soft-foreground"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-brand" : "text-muted",
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
      {active && !collapsed ? (
        <span
          aria-hidden
          className="bg-brand absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r"
        />
      ) : null}
    </Link>
  );
}

interface BottomNavItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  active: boolean;
}

export function BottomNavItem({
  icon: Icon,
  label,
  href,
  active,
}: BottomNavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-medium transition-colors",
        "min-h-[56px]",
        active ? "text-brand" : "text-muted",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-12 items-center justify-center rounded-full transition-colors",
          active ? "bg-brand-soft" : "bg-transparent",
        )}
      >
        <Icon className="h-[20px] w-[20px]" />
      </span>
      <span className="leading-tight">{label}</span>
    </Link>
  );
}
