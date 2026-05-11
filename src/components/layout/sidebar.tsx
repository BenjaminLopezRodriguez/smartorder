"use client";

import { usePathname } from "next/navigation";
import { ScanLine, Zap } from "lucide-react";

import { Button } from "~/components/ui/button";
import { isNavActive, PRIMARY_NAV } from "~/lib/nav";
import { cn } from "~/lib/utils";
import { useUIStore } from "~/stores/ui-store";

import { SidebarNavItem } from "./nav-item";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "bg-sidebar-bg hidden shrink-0 lg:flex lg:flex-col",
        "h-screen sticky top-0",
        collapsed ? "w-[72px]" : "w-[240px]",
        "transition-[width] duration-150 ease-out",
      )}
      style={{ borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center px-4",
          collapsed ? "justify-center px-0" : "justify-start",
        )}
      >
        <Brand collapsed={collapsed} />
      </div>

      <div style={{ borderBottom: "1px solid var(--sidebar-border)" }} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
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
          <div className="mt-6">
            <p className="text-sidebar-text-muted mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase">
              Quick actions
            </p>
            <Button
              asChild
              size="lg"
              block
              className="justify-start bg-brand/90 text-white hover:bg-brand shadow-none"
            >
              <a href="/lists/new">
                <ScanLine className="h-[18px] w-[18px]" />
                New scan session
              </a>
            </Button>
          </div>
        ) : null}
      </nav>

      <div style={{ borderTop: "1px solid var(--sidebar-border)" }} />

      {/* Workspace footer */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-4",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/20">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-sidebar-text truncate text-xs font-semibold">
              SmartOrder
            </p>
            <p className="text-sidebar-text-muted truncate text-[11px]">
              Workspace
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "gap-0")}>
      <span className="bg-brand flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
        <Zap className="h-4 w-4 text-white" />
      </span>
      {!collapsed ? (
        <p className="text-sidebar-text text-[15px] font-semibold leading-tight tracking-tight">
          SmartOrder
        </p>
      ) : null}
    </div>
  );
}
