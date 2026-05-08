"use client";

import { usePathname } from "next/navigation";
import { Boxes, ScanLine } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { isNavActive, PRIMARY_NAV } from "~/lib/nav";
import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui-store";

import { SidebarNavItem } from "./nav-item";

/**
 * Desktop sidebar (lg+). Hidden on mobile — bottom nav takes over there.
 *
 * Width is intentionally fixed (240/72px) so content gets a stable canvas.
 */
export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "bg-surface border-border hidden shrink-0 border-r lg:flex lg:flex-col",
        "h-screen sticky top-0",
        collapsed ? "w-[72px]" : "w-[240px]",
        "transition-[width] duration-150 ease-out",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center px-4",
          collapsed ? "justify-center px-0" : "justify-start",
        )}
      >
        <Brand collapsed={collapsed} />
      </div>
      <Separator />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <li key={item.id}>
              <SidebarNavItem
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={isNavActive(pathname, item.href)}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>

        {!collapsed ? (
          <>
            <p className="text-muted mt-6 px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] uppercase">
              Workflows
            </p>
            <Button
              asChild
              variant="primary"
              size="lg"
              block
              className="justify-start"
            >
              <a href="/dashboard#scan">
                <ScanLine className="h-[18px] w-[18px]" />
                Start scan session
              </a>
            </Button>
          </>
        ) : null}
      </nav>

      <Separator />
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-4",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-foreground truncate text-xs font-semibold">
              Northside Market
            </p>
            <p className="text-muted truncate text-[11px]">2 active lists</p>
          </div>
        ) : (
          <span className="bg-brand-soft text-brand-soft-foreground flex h-8 w-8 items-center justify-center rounded-md text-[11px] font-semibold">
            NM
          </span>
        )}
      </div>
    </aside>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "gap-0")}>
      <span className="bg-brand text-brand-foreground flex h-9 w-9 items-center justify-center rounded-md shadow-flat">
        <Boxes className="h-5 w-5" />
      </span>
      {!collapsed ? (
        <div className="min-w-0">
          <p className="text-foreground text-[15px] leading-tight font-semibold tracking-tight">
            SmartOrder
          </p>
          <p className="text-muted text-[10px] leading-tight tracking-wide uppercase">
            Operations
          </p>
        </div>
      ) : null}
    </div>
  );
}
