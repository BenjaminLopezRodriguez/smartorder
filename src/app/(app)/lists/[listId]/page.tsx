import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Package, Pencil, Play } from "lucide-react";
import { type Metadata } from "next";

import { api } from "~/trpc/server";
import { cn } from "~/lib/utils";

export const metadata: Metadata = { title: "Order List" };

function ProductThumb({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="bg-surface-2 text-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
      {initials || <Package className="h-5 w-5" />}
    </div>
  );
}

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const list = await api.lists.byId({ id: listId });
  if (!list) notFound();

  const isComplete = list.status === "complete";

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-bold">{list.name}</h1>
          <p className="text-muted text-sm">{list.items.length} items</p>
        </div>
        <Link
          href={`/search?listId=${list.id}`}
          className="text-brand flex items-center gap-1 text-sm font-semibold"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Link>
      </div>

      {/* Items list */}
      {list.items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-foreground text-base font-semibold">No items yet</p>
          <p className="text-muted text-sm">
            Search the catalog and add items to this list.
          </p>
          <Link
            href={`/search?listId=${list.id}`}
            className="bg-brand text-brand-foreground mt-2 rounded-xl px-6 py-3 text-sm font-semibold"
          >
            Add Items
          </Link>
        </div>
      ) : (
        <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-xl border shadow-card">
          {list.items.map((item, i) => {
            const scanned = item.scannedCases + item.scannedUnits;
            const target = item.targetCases + item.targetUnits;
            const done = scanned > 0 && scanned >= target && target > 0;
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  done && "opacity-60",
                )}
              >
                <ProductThumb name={item.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {item.name}
                  </p>
                  <p className="text-muted text-xs">
                    {item.packSize ?? item.unitType}
                  </p>
                  {item.barcode && (
                    <p className="text-muted font-mono text-[11px]">{item.barcode}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <p className="text-foreground text-lg font-bold tabular-nums">
                    {item.scannedCases > 0 ? item.scannedCases : item.targetCases || "—"}
                  </p>
                  <p className="text-muted text-xs">{item.unitType}</p>
                </div>
                {done && (
                  <CheckCircle2 className="text-success h-5 w-5 shrink-0" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Fixed bottom Start Scan button */}
      {list.items.length > 0 && !isComplete && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/90 to-transparent p-4 lg:bottom-0">
          <Link
            href={`/lists/${list.id}/scan`}
            className="bg-brand text-brand-foreground flex h-14 w-full max-w-lg mx-auto items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-md"
          >
            <Play className="h-5 w-5" />
            Start Scan
          </Link>
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <div className="mt-4 flex gap-3">
          <Link
            href={`/lists/${list.id}/review`}
            className="border-border text-foreground flex h-12 flex-1 items-center justify-center rounded-xl border text-sm font-semibold"
          >
            View Results
          </Link>
          <Link
            href={`/lists/new`}
            className="bg-brand text-brand-foreground flex h-12 flex-1 items-center justify-center rounded-xl text-sm font-semibold"
          >
            New List
          </Link>
        </div>
      )}
    </div>
  );
}
