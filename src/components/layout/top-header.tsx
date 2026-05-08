"use client";

import { Boxes, Menu, Search } from "lucide-react";
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
        "bg-surface/85 border-border sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur sm:px-6",
        "lg:flex",
      )}
    >
      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile brand — hidden when page has its own header (handled per-page) */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 lg:hidden"
        aria-label="SmartOrder home"
      >
        <span className="bg-brand text-brand-foreground flex h-7 w-7 items-center justify-center rounded-md">
          <Boxes className="h-3.5 w-3.5" />
        </span>
        <span className="text-foreground text-sm font-semibold tracking-tight">
          SmartOrder
        </span>
      </Link>

      {/* Desktop page title */}
      <h1 className="text-foreground hidden text-[15px] font-semibold tracking-tight lg:block">
        {title}
      </h1>

      {/* Desktop search */}
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
      className="border-border-strong bg-surface text-muted hidden w-full max-w-md items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-surface-2 lg:flex"
    >
      <Search className="text-muted h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">Search inventory…</span>
    </Link>
  );
}
