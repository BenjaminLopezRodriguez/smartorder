import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Package } from "lucide-react";
import { type Metadata } from "next";

import { api } from "~/trpc/server";
import { ReviewFinishButton } from "~/components/lists/review-finish-button";

export const metadata: Metadata = { title: "Review Scans" };

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

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const list = await api.lists.byId({ id: listId });
  if (!list) notFound();

  const totalCases = list.items.reduce((a, i) => a + i.scannedCases, 0);
  const totalUnits = list.items.reduce((a, i) => a + i.scannedUnits, 0);

  const totalParts: string[] = [];
  if (totalCases > 0) totalParts.push(`${totalCases} case${totalCases !== 1 ? "s" : ""}`);
  if (totalUnits > 0) totalParts.push(`${totalUnits} unit${totalUnits !== 1 ? "s" : ""}`);
  const totalLabel = totalParts.length ? totalParts.join(", ") : "0 items";

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/lists/${listId}`} aria-label="Back" className="text-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-foreground text-lg font-bold">Review Scans</h1>
          <p className="text-muted text-sm">{list.items.length} items</p>
        </div>
      </div>

      {/* Items */}
      <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-xl border shadow-card">
        {list.items.map((item, i) => {
          const scanned = item.scannedCases + item.scannedUnits;
          const done = scanned > 0;
          return (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
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
                  {item.scannedCases}
                </p>
                <p className="text-muted text-xs">{item.unitType}</p>
              </div>
              {done ? (
                <CheckCircle2 className="text-success h-5 w-5 shrink-0" />
              ) : (
                <span className="bg-surface-2 flex h-5 w-5 shrink-0 rounded-full" />
              )}
            </li>
          );
        })}
      </ul>

      {/* Total row */}
      <div className="border-border mt-0 flex items-center justify-between rounded-b-none rounded-xl border border-t-0 bg-white px-4 py-3 shadow-card">
        <p className="text-foreground text-sm font-semibold">Total</p>
        <p className="text-foreground text-sm font-semibold">{totalLabel}</p>
      </div>

      {/* Finish button */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background/90 to-transparent p-4 lg:bottom-0">
        <ReviewFinishButton listId={listId} />
      </div>
    </div>
  );
}
