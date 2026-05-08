"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

type ScanListItem = {
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

export function useScanSession(listId: string, initialItems: ScanListItem[]) {
  const router = useRouter();
  const utils = api.useUtils();
  const [idx, setIdx] = useState(0);

  const { data } = api.lists.byId.useQuery({ id: listId });
  const items: ScanListItem[] =
    (data?.items as ScanListItem[] | undefined) ?? initialItems;

  const current = items[idx] ?? null;
  const isLast = idx >= items.length - 1;
  const progress = items.length > 0 ? (idx / items.length) * 100 : 0;

  const update = api.lists.updateScanCounts.useMutation({
    onSuccess: async () => {
      await utils.lists.byId.invalidate({ id: listId });
    },
  });
  const setStatus = api.lists.setStatus.useMutation();

  function increment() {
    if (!current) return;
    update.mutate({
      listItemId: current.id,
      scannedCases: current.scannedCases + 1,
      scannedUnits: current.scannedUnits,
    });
  }

  function decrement() {
    if (!current) return;
    update.mutate({
      listItemId: current.id,
      scannedCases: Math.max(0, current.scannedCases - 1),
      scannedUnits: current.scannedUnits,
    });
  }

  async function advance() {
    if (isLast) {
      await setStatus.mutateAsync({ listId, status: "review" });
      router.push(`/lists/${listId}/review`);
    } else {
      setIdx((v) => v + 1);
    }
  }

  function exit() {
    router.push(`/lists/${listId}`);
  }

  return {
    items,
    current,
    idx,
    isLast,
    progress,
    isPending: update.isPending,
    isFinishing: setStatus.isPending,
    increment,
    decrement,
    advance,
    exit,
  };
}
