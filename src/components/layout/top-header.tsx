"use client";

import { Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { PRIMARY_NAV, isNavActive } from "~/lib/nav";
import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui-store";

export function TopHeader() {
  const pathname = usePathname();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const active = PRIMARY_NAV.find((item) => isNavActive(pathname, item.href));
  const title = active?.label ?? "SmartOrder";

  return (
    <header
      className={cn(
        "bg-surface/90 border-border sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-sm sm:px-6",
      )}
    >
      {/* Desktop: sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-[18px] w-[18px]" />
      </Button>

      {/* Mobile: wordmark */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 lg:hidden"
        aria-label="SmartOrder home"
      >
        <span className="text-foreground text-sm font-semibold tracking-tight">
          SmartOrder
        </span>
      </Link>

      {/* Desktop: page title */}
      <span className="text-muted hidden text-[13px] lg:block">/</span>
      <h1 className="text-foreground hidden text-[14px] font-medium lg:block">
        {title}
      </h1>

      {/* Desktop: centered search */}
      <div className="hidden flex-1 justify-center lg:flex">
        <DesktopSearchTrigger />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1">
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
      </div>
    </header>
  );
}

function DesktopSearchTrigger() {
  return (
    <Link
      href="/search"
      className="border-border bg-surface-2 text-muted flex w-full max-w-sm items-center gap-2.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-surface hover:border-border-strong"
    >
      <Search className="text-muted h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left text-[13px]">Search inventory…</span>
      <kbd className="bg-surface border-border hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:block">
        /
      </kbd>
    </Link>
  );
}
