"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function CreateListForm() {
  const router = useRouter();
  const [name, setName] = useState("");

  const create = api.lists.create.useMutation({
    onSuccess: (created) => {
      router.push(`/lists/${created.id}`);
    },
  });

  return (
    <form
      className="bg-surface border-border rounded-card flex flex-col gap-3 border p-4 shadow-card sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ name });
      }}
    >
      <label className="text-muted text-xs font-semibold tracking-wide uppercase">
        List name
      </label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Tuesday produce + dry goods"
        required
      />
      <div className="flex items-center justify-end">
        <Button type="submit" size="lg" disabled={create.isPending}>
          <Plus className="h-4 w-4" />
          Create list
        </Button>
      </div>
      {create.error ? (
        <p className="text-danger text-sm">{create.error.message}</p>
      ) : null}
    </form>
  );
}

