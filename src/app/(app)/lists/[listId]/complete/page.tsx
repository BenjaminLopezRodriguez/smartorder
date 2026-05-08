import Link from "next/link";
import { notFound } from "next/navigation";
import { type Metadata } from "next";

import { api } from "~/trpc/server";

export const metadata: Metadata = { title: "List Complete" };

function formatTime(d: Date | null | undefined) {
  if (!d) return "";
  const today = new Date();
  const dateStr =
    d.toDateString() === today.toDateString()
      ? "Today"
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateStr}, ${timeStr}`;
}

export default async function CompletePage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const list = await api.lists.byId({ id: listId });
  if (!list) notFound();

  const totalScanned = list.items.filter(
    (i) => i.scannedCases + i.scannedUnits > 0,
  ).length;
  const remaining = list.items.length - totalScanned;
  const pct =
    list.items.length === 0
      ? 0
      : Math.round((totalScanned / list.items.length) * 100);

  const csvRows = list.items.map((item) => ({
    name: item.name,
    vendor: item.vendor ?? "",
    packSize: item.packSize ?? "",
    scannedCases: item.scannedCases,
    scannedUnits: item.scannedUnits,
    barcode: item.barcode ?? "",
  }));
  const csvHeader = Object.keys(csvRows[0] ?? {}).join(",");
  const csvBody = csvRows
    .map((r) => Object.values(r).map(String).join(","))
    .join("\n");
  const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(`${csvHeader}\n${csvBody}`)}`;

  return (
    <div className="flex flex-col items-center px-2 pb-24 pt-8 text-center">
      {/* Confetti illustration */}
      <div className="text-6xl">🎉</div>

      <h1 className="text-foreground mt-4 text-2xl font-bold">
        You&apos;re all set!
      </h1>
      <p className="text-muted mt-1 text-base">All items scanned.</p>

      {/* Stats row */}
      <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-3">
        {[
          { label: "Total Scanned", value: totalScanned },
          { label: "Remaining", value: remaining },
          { label: "Complete", value: `${pct}%` },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-surface border-border rounded-card flex flex-col items-center justify-center border p-3 shadow-card"
          >
            <p className="text-foreground text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-muted mt-0.5 text-center text-[11px] leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Summary card */}
      <div className="bg-surface border-border mt-5 w-full max-w-sm rounded-xl border p-4 shadow-card">
        <p className="text-foreground text-left text-sm font-semibold">
          Order List Summary
        </p>
        <p className="text-muted mt-1 text-left text-sm">{list.items.length} items</p>
        <p className="text-muted text-left text-sm">{formatTime(list.updatedAt)}</p>

        {/* Action row */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/lists/${list.id}`}
            className="border-border text-foreground flex h-10 items-center justify-center rounded-xl border text-sm font-semibold"
          >
            View List
          </Link>
          <a
            href={csvDataUrl}
            download={`${list.name}.csv`}
            className="border-border text-foreground flex h-10 items-center justify-center rounded-xl border text-sm font-semibold"
          >
            Export List
          </a>
        </div>
      </div>

      {/* New List */}
      <Link
        href="/lists/new"
        className="bg-brand text-brand-foreground mt-4 flex h-14 w-full max-w-sm items-center justify-center rounded-xl text-base font-semibold shadow-md"
      >
        New List
      </Link>
    </div>
  );
}
