import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { type Metadata } from "next";

import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";
import { InventoryStats } from "~/components/dashboard/inventory-stats";
import { QuickActions } from "~/components/dashboard/quick-actions";
import { RecentActivity } from "~/components/dashboard/recent-activity";
import { RecentLists } from "~/components/dashboard/recent-lists";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        eyebrow="Operations"
        title="Good morning, Northside"
        description="Pick up where you left off — recent lists, catalog stats, and the four core SmartOrder workflows."
        actions={
          <>
            <Button asChild variant="secondary" size="lg">
              <Link href="/lists">
                <Plus className="h-4 w-4" />
                New list
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/lists#scan">
                <ScanLine className="h-4 w-4" />
                Start scan
              </Link>
            </Button>
          </>
        }
      />

      <QuickActions />
      <InventoryStats />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentLists />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
