import Link from "next/link";
import { FileSpreadsheet, Plus } from "lucide-react";
import { type Metadata } from "next";

import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { EmptyState } from "~/components/ui/empty-state";

export const metadata: Metadata = { title: "Order guides" };

const SOURCE_LABEL: Record<string, string> = {
  csv: "CSV",
  pdf: "PDF",
  image: "Photo",
};

function formatDate(d: Date | null | undefined) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OrderGuidesPage() {
  const guides = await api.orderGuides.list({ limit: 50 });

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-foreground text-xl font-bold">Order guides</h1>
        <Link
          href="/order-guides/import"
          className="bg-brand text-brand-foreground flex h-11 min-h-[48px] items-center gap-1.5 rounded-xl px-4 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Import CSV
        </Link>
      </div>

      {guides.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No order guides yet"
          description="Import a CSV order sheet to capture line items, then create a prep list."
          action={
            <Link
              href="/order-guides/import"
              className="bg-brand text-brand-foreground rounded-xl px-6 py-3 text-sm font-semibold"
            >
              Import CSV
            </Link>
          }
        />
      ) : (
        <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-xl border shadow-card">
          {guides.map((g) => (
            <li key={g.id}>
              <Link
                href={`/order-guides/${g.id}`}
                className="hover:bg-surface-2 flex min-h-[48px] items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <span className="bg-brand-soft text-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {g.name}
                  </p>
                  <p className="text-muted mt-0.5 text-xs">
                    {formatDate(g.createdAt)}
                    {g.vendor ? ` · ${g.vendor}` : ""}
                  </p>
                </div>
                <Badge tone="neutral" size="sm">
                  {SOURCE_LABEL[g.sourceType] ?? g.sourceType}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
