import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Package } from "lucide-react";
import { type Metadata } from "next";

import { api } from "~/trpc/server";
import { CreateListFromGuide } from "~/components/order-guides/create-list-from-guide";

export const metadata: Metadata = { title: "Order guide" };

const SOURCE_LABEL: Record<string, string> = {
  csv: "CSV import",
  pdf: "PDF",
  image: "Photo",
};

export default async function OrderGuideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guide = await api.orderGuides.byId({ id });
  if (!guide) notFound();

  const hasBarcodes = guide.items.some((i) => Boolean(i.barcode?.trim()));
  const defaultListName = `${guide.name} prep`;

  return (
    <div className="flex max-w-3xl flex-col gap-6 pb-24">
      <div>
        <Link
          href="/order-guides"
          className="text-brand mb-2 inline-block text-sm font-semibold"
        >
          ← Order guides
        </Link>
        <h1 className="text-foreground text-xl font-bold">{guide.name}</h1>
        <p className="text-muted mt-1 text-sm">
          {SOURCE_LABEL[guide.sourceType] ?? guide.sourceType}
          {guide.vendor ? ` · ${guide.vendor}` : ""}
        </p>
      </div>

      {guide.fileUrl ? (
        <a
          href={guide.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-surface flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-card"
        >
          <ExternalLink className="h-4 w-4" />
          Open attached file
        </a>
      ) : null}

      <CreateListFromGuide
        orderGuideId={guide.id}
        defaultListName={defaultListName}
        disabled={guide.items.length === 0}
        disabledReason="Add line items via CSV import to create a list from this guide."
      />

      {hasBarcodes ? (
        <Link
          href="/barcodes"
          className="border-border bg-surface text-foreground flex min-h-[48px] items-center justify-center rounded-xl border py-3 text-sm font-semibold shadow-card hover:bg-surface-2"
        >
          Scan barcodes for items on this guide
        </Link>
      ) : null}

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">
          Line items ({guide.items.length})
        </h2>
        {guide.items.length === 0 ? (
          <p className="text-muted text-sm">
            No parsed rows yet. Import a CSV from{" "}
            <Link href="/order-guides/import" className="text-brand font-semibold">
              Import order guide
            </Link>
            .
          </p>
        ) : (
          <ul className="bg-surface border-border divide-border divide-y overflow-hidden rounded-xl border shadow-card">
            {guide.items.map((item) => (
              <li
                key={item.id}
                className="flex min-h-[52px] items-start gap-3 px-4 py-3"
              >
                <span className="bg-surface-2 text-muted mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Package className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-sm font-semibold">
                    {item.rawName}
                  </p>
                  <p className="text-muted text-xs">
                    {[item.vendor, item.packSize, item.unitType]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {item.barcode ? (
                    <p className="text-muted mt-0.5 font-mono text-[11px]">
                      {item.barcode}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
