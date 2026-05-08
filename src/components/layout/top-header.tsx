"use client";

import { Bell, Boxes, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { PRIMARY_NAV, isNavActive } from "~/lib/nav";
import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui-store";

/**
 * Top header — sticky, low chrome.
 *
 * Desktop: page title left, command-bar style search center, notifications + avatar right.
 * Mobile: brand left, search icon + avatar right. Sidebar toggle hidden on mobile (bottom nav handles nav).
 */
export function TopHeader() {
  const pathname = usePathname();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const active = PRIMARY_NAV.find((item) => isNavActive(pathname, item.href));
  const title = active?.label ?? "SmartOrder";

  return (
    <header
      className={cn(
        "bg-surface/85 border-border sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 lg:hidden"
        aria-label="SmartOrder home"
      >
        <span className="bg-brand text-brand-foreground flex h-8 w-8 items-center justify-center rounded-md">
          <Boxes className="h-4 w-4" />
        </span>
        <span className="text-foreground text-sm font-semibold tracking-tight">
          SmartOrder
        </span>
      </Link>

      <h1 className="text-foreground hidden text-[15px] font-semibold tracking-tight lg:block">
        {title}
      </h1>

      <div className="flex flex-1 justify-center">
        <DesktopSearchTrigger />
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Search"
        >
          <Link href="/search">
            <Search className="h-5 w-5" />
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span
            aria-hidden
            className="bg-brand absolute top-2 right-2 h-1.5 w-1.5 rounded-full"
          />
        </Button>

        <Avatar name="Operations Lead" />
      </div>
    </header>
  );
}

function DesktopSearchTrigger() {
  return (
    <Link
      href="/search"
      className={cn(
        "border-border-strong bg-surface text-muted hidden w-full max-w-md items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-surface-2 sm:flex",
      )}
    >
      <Search className="text-muted h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">Search inventory, lists, snapshots…</span>
      <span className="flex items-center gap-1">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </span>
    </Link>
  );
}
