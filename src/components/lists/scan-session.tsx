"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Package, Plus, X } from "lucide-react";

import { api } from "~/trpc/react";

type ListItem = {
  id: string;
  name: string;
  vendor: string | null;
  packSize: string | null;
  unitType: string;
  barcode: string | null;
  targetCases: number;
  targetUnits: number;
  scannedCases: number;
  scannedUnits: number;
};

function BarcodeVisual({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* CSS barcode stripes */}
      <div className="flex h-10 items-end gap-px overflow-hidden rounded-sm">
        {value.split("").map((char, i) => {
          const h = [60, 80, 100, 70, 90, 55, 75, 85, 65, 95][i % 10];
          const w = i % 3 === 0 ? 3 : 2;
          return (
            <div
              key={i}
              className="bg-foreground"
              style={{ width: w, height: `${h}%` }}
            />
          );
        })}
      </div>
      <p className="text-foreground font-mono text-sm tracking-widest">{value}</p>
    </div>
  );
}

function ProductThumb({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="bg-surface-2 flex h-44 w-44 items-center justify-center rounded-2xl">
      <div className="flex flex-col items-center gap-2">
        <Package className="text-muted h-16 w-16" />
        <span className="text-foreground text-sm font-bold">{initials}</span>
      </div>
    </div>
  );
}

export function ScanSession({
  listId,
  initialItems,
}: {
  listId: string;
  initialItems: ListItem[];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [idx, setIdx] = useState(0);

  const { data } = api.lists.byId.useQuery({ id: listId });
  const items: ListItem[] = (data?.items as ListItem[] | undefined) ?? initialItems;
  const current = items[idx] ?? null;
  const isLast = idx >= items.length - 1;

  const update = api.lists.updateScanCounts.useMutation({
    onSuccess: async () => {
      await utils.lists.byId.invalidate({ id: listId });
    },
  });
  const setStatus = api.lists.setStatus.useMutation();

  function handleIncrement() {
    if (!current) return;
    update.mutate({
      listItemId: current.id,
      scannedCases: current.scannedCases + 1,
      scannedUnits: current.scannedUnits,
    });
  }

  function handleDecrement() {
    if (!current) return;
    update.mutate({
      listItemId: current.id,
      scannedCases: Math.max(0, current.scannedCases - 1),
      scannedUnits: current.scannedUnits,
    });
  }

  async function handleNext() {
    if (isLast) {
      await setStatus.mutateAsync({ listId, status: "review" });
      router.push(`/lists/${listId}/review`);
    } else {
      setIdx((v) => v + 1);
    }
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6 text-center">
        <p className="text-foreground text-lg font-bold">No items to scan</p>
        <p className="text-muted mt-2 text-sm">Add items to the list first.</p>
        <Link
          href={`/lists/${listId}`}
          className="bg-brand text-white mt-6 rounded-xl px-8 py-3 text-sm font-semibold"
        >
          Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Dark header */}
      <div className="bg-[#1b1b2e] flex items-center px-4 py-4">
        <button
          onClick={() => router.push(`/lists/${listId}`)}
          aria-label="Exit scan"
          className="text-white/70 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="flex-1 text-center text-sm font-semibold text-white">
          Scanning Item {idx + 1} of {items.length}
        </p>
        <span className="w-5" aria-hidden />
      </div>

      {/* Scrollable content */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 py-6">
        {/* Product image */}
        <ProductThumb name={current.name} />

        {/* Product info */}
        <div className="mt-5 text-center">
          <h2 className="text-foreground text-2xl font-bold">{current.name}</h2>
          <p className="text-muted mt-1 text-base">{current.packSize ?? current.unitType}</p>
          {current.barcode && (
            <p className="text-muted mt-0.5 font-mono text-sm">{current.barcode}</p>
          )}
        </div>

        {/* Barcode */}
        {current.barcode && (
          <div className="mt-5 w-full rounded-xl border border-gray-200 bg-white px-6 py-4">
            <BarcodeVisual value={current.barcode} />
          </div>
        )}

        {/* Count stepper */}
        <div className="mt-6 flex w-full items-center justify-between rounded-2xl border border-gray-200 px-6 py-4">
          <button
            onClick={handleDecrement}
            disabled={update.isPending || current.scannedCases === 0}
            aria-label="Decrease"
            className="text-brand flex h-12 w-12 items-center justify-center rounded-full border-2 border-current text-xl font-semibold disabled:opacity-30"
          >
            <Minus className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="text-foreground text-4xl font-bold tabular-nums">
              {current.scannedCases}
            </p>
            <p className="text-muted text-sm">{current.unitType}s</p>
          </div>

          <button
            onClick={handleIncrement}
            disabled={update.isPending}
            aria-label="Increase"
            className="bg-brand flex h-12 w-12 items-center justify-center rounded-full text-white"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div className="border-border border-t bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <button
          onClick={handleNext}
          disabled={setStatus.isPending}
          className="bg-brand text-brand-foreground flex h-14 w-full items-center justify-center rounded-xl text-base font-semibold shadow-sm disabled:opacity-60"
        >
          {isLast ? "Finish" : "Next"}
        </button>
        <p className="text-muted mt-2 text-center text-xs">
          Tip: Use your Zebra scanner to scan
        </p>
      </div>
    </div>
  );
}
