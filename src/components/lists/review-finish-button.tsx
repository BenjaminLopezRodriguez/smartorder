"use client";

import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function ReviewFinishButton({ listId }: { listId: string }) {
  const router = useRouter();
  const setStatus = api.lists.setStatus.useMutation({
    onSuccess: () => {
      router.push(`/lists/${listId}/complete`);
    },
  });

  return (
    <button
      onClick={() => setStatus.mutate({ listId, status: "complete" })}
      disabled={setStatus.isPending}
      className="bg-brand text-brand-foreground flex h-14 w-full max-w-lg mx-auto items-center justify-center rounded-xl text-base font-semibold shadow-md disabled:opacity-60"
    >
      {setStatus.isPending ? "Saving…" : "Finish"}
    </button>
  );
}
