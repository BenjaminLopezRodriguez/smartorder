import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { Section } from "~/components/ui/section";
import { Button } from "~/components/ui/button";

interface RecentList {
  id: string;
  name: string;
  itemCount: number;
  status: "draft" | "scanning" | "review" | "complete";
  updatedLabel: string;
}

const RECENT_LISTS: RecentList[] = [
  {
    id: "1",
    name: "Tuesday produce + dry goods",
    itemCount: 42,
    status: "scanning",
    updatedLabel: "Updated 12 min ago",
  },
  {
    id: "2",
    name: "Bakery weekly order",
    itemCount: 18,
    status: "draft",
    updatedLabel: "Updated 1 hour ago",
  },
  {
    id: "3",
    name: "Cleaning + paper",
    itemCount: 23,
    status: "review",
    updatedLabel: "Updated yesterday",
  },
  {
    id: "4",
    name: "Coffee bar restock",
    itemCount: 11,
    status: "complete",
    updatedLabel: "Updated 2 days ago",
  },
];

const STATUS_TONE: Record<
  RecentList["status"],
  { label: string; tone: "neutral" | "brand" | "warning" | "success" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  scanning: { label: "Scanning", tone: "brand" },
  review: { label: "Review", tone: "warning" },
  complete: { label: "Complete", tone: "success" },
};

export function RecentLists() {
  if (RECENT_LISTS.length === 0) {
    return (
      <Section title="Recent lists">
        <EmptyState
          icon={ListChecks}
          title="No lists yet"
          description="Import an order guide or build a list with voice to get started."
          action={
            <Button asChild>
              <Link href="/lists">Create list</Link>
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      title="Recent lists"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/lists">View all</Link>
        </Button>
      }
    >
      <ul className="bg-surface border-border rounded-card divide-border divide-y overflow-hidden border shadow-card">
        {RECENT_LISTS.map((list) => {
          const status = STATUS_TONE[list.status];
          return (
            <li key={list.id}>
              <Link
                href={`/lists/${list.id}`}
                className="hover:bg-surface-2 flex items-center gap-4 px-4 py-3.5 transition-colors sm:px-5"
              >
                <span className="bg-surface-2 text-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                  <ListChecks className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground truncate text-sm font-semibold">
                      {list.name}
                    </p>
                    <Badge tone={status.tone} size="sm">
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-muted mt-0.5 text-xs">
                    {list.itemCount} items · {list.updatedLabel}
                  </p>
                </div>
                <ChevronRight className="text-muted h-4 w-4 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
