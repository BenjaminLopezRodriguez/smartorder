import Link from "next/link";
import { Barcode, Bell, ChevronDown, ClipboardList, Plus } from "lucide-react";
import { type Metadata } from "next";

import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";

export const metadata: Metadata = { title: "Home" };

function getHourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_MAP: Record<string, { label: string; tone: "brand" | "success" | "warning" | "neutral" }> = {
  draft: { label: "Draft", tone: "neutral" },
  scanning: { label: "In Progress", tone: "brand" },
  review: { label: "Review", tone: "warning" },
  complete: { label: "Completed", tone: "success" },
};

export default async function DashboardPage() {
  const [stats, lists] = await Promise.all([
    api.lists.stats(),
    api.lists.all({ limit: 5 }),
  ]);

  const greeting = getHourGreeting();

  return (
    <div className="flex flex-col">
      {/* Mobile greeting header */}
      <div className="flex items-start justify-between px-1 pb-5 pt-1 lg:hidden">
        <div>
          <h1 className="text-foreground text-xl font-bold">
            {greeting}, Alex 👋
          </h1>
          <button className="text-muted mt-0.5 flex items-center gap-1 text-sm">
            Downtown Office
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <button className="relative -mt-0.5">
          <Bell className="text-foreground h-6 w-6" />
          <span className="bg-brand absolute top-0 right-0 h-2 w-2 rounded-full" />
        </button>
      </div>

      {/* Desktop greeting */}
      <div className="hidden pb-6 lg:block">
        <h1 className="text-foreground text-2xl font-bold">
          {greeting}, Alex 👋
        </h1>
        <p className="text-muted mt-1 text-sm">Downtown Office</p>
      </div>

      {/* Overview stats */}
      <div>
        <p className="text-foreground mb-3 text-sm font-semibold">Overview</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Items in List", value: stats.itemsInList },
            { label: "Scanned", value: stats.scanned },
            { label: "Remaining", value: stats.remaining },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-surface border-border rounded-card flex flex-col items-center justify-center border p-3 shadow-card"
            >
              <p className="text-foreground text-2xl font-bold tabular-nums">
                {s.value}
              </p>
              <p className="text-muted mt-0.5 text-center text-[11px] leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* New Order List CTA */}
      <Link
        href="/lists/new"
        className="bg-brand text-brand-foreground mt-4 flex h-14 items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-sm"
      >
        New Order List
        <Plus className="h-5 w-5" />
      </Link>

      <Link
        href="/barcodes"
        className="bg-surface border-border text-foreground mt-3 flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold shadow-card hover:bg-surface-2"
      >
        Scan barcodes
        <Barcode className="h-4 w-4" />
      </Link>

      {/* Recent Lists */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-foreground text-sm font-semibold">Recent Lists</p>
          <Link href="/lists" className="text-brand text-sm font-medium">
            View all
          </Link>
        </div>

        {lists.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No lists yet"
            description="Create your first order list to get started."
            action={
              <Link
                href="/lists/new"
                className="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium"
              >
                New List
              </Link>
            }
          />
        ) : (
          <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border shadow-card">
            {lists.map((list) => {
              const s = STATUS_MAP[list.status] ?? STATUS_MAP.draft!;
              return (
                <li key={list.id}>
                  <Link
                    href={`/lists/${list.id}`}
                    className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3.5 transition-colors"
                  >
                    <span className="bg-brand-soft text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-sm font-semibold">
                        {list.name}
                      </p>
                      <p className="text-muted mt-0.5 text-xs">
                        {formatDate(list.updatedAt)} · {list.itemCount} items
                      </p>
                    </div>
                    <Badge tone={s.tone} size="sm">
                      {s.label}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
