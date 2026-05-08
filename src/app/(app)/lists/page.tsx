import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import { type Metadata } from "next";

import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";
import { getListStatus } from "~/features/lists/utils/status";
import { formatShortDate } from "~/lib/format";

export const metadata: Metadata = { title: "Lists" };

export default async function ListsPage() {
  const lists = await api.lists.all({ limit: 50 });

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-foreground text-xl font-bold">My Lists</h1>
        <Link
          href="/lists/new"
          className="bg-brand text-brand-foreground flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No lists yet"
          description="Create your first order list to start scanning."
          action={
            <Link
              href="/lists/new"
              className="bg-brand text-brand-foreground rounded-xl px-6 py-3 text-sm font-semibold"
            >
              New List
            </Link>
          }
        />
      ) : (
        <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-xl border shadow-card">
          {lists.map((list) => {
            const s = getListStatus(list.status);
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
                      {formatShortDate(list.updatedAt)} · {list.itemCount} items
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
  );
}
