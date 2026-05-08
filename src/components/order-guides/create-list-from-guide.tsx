"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type Props = {
  orderGuideId: string;
  defaultListName: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function CreateListFromGuide({
  orderGuideId,
  defaultListName,
  disabled,
  disabledReason,
}: Props) {
  const router = useRouter();
  const [listName, setListName] = useState(defaultListName);

  const mutation = api.orderGuides.createListFromGuide.useMutation({
    onSuccess: (res) => {
      if (res.ok && res.listId) {
        router.push(`/lists/${res.listId}`);
      }
    },
  });

  return (
    <div className="bg-surface border-border rounded-card border p-4 shadow-card sm:p-5">
      <h2 className="text-foreground text-sm font-semibold">Create prep list</h2>
      <p className="text-muted mt-1 text-xs leading-relaxed">
        Builds a list from this guide and links catalog items (matching by barcode
        or name when enabled during import).
      </p>
      {disabled ? (
        <p className="text-muted mt-3 text-sm">{disabledReason}</p>
      ) : (
        <>
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-muted text-xs font-semibold tracking-wide uppercase">
              List name
            </span>
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              required
            />
          </label>
          <Button
            type="button"
            variant="primary"
            size="lg"
            block
            className="mt-4"
            disabled={mutation.isPending || !listName.trim()}
            onClick={() =>
              mutation.mutate({
                orderGuideId,
                listName: listName.trim(),
                syncCatalog: true,
              })
            }
          >
            {mutation.isPending ? "Creating…" : "Create list"}
          </Button>
          {mutation.data && !mutation.data.ok ? (
            <p className="text-danger mt-3 text-sm">{mutation.data.error}</p>
          ) : null}
          {mutation.error ? (
            <p className="text-danger mt-3 text-sm">{mutation.error.message}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
