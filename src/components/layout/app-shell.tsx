import { type ReactNode } from "react";

import { MobileBottomNav } from "./mobile-bottom-nav";
import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";

/**
 * AppShell — single layout for every authenticated screen.
 *
 * Layout responsibilities:
 *  - Sidebar (lg+) on the left
 *  - TopHeader sticky at the top of the main column
 *  - Bottom nav fixed on mobile
 *  - Main scroll area with consistent gutter + bottom safe-area for the nav
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:pb-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
