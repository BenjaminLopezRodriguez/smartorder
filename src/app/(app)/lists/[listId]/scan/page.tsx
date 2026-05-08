import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { ScanSession } from "~/components/lists/scan-session";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "Scan",
};

export default async function ScanPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = await params;
  const list = await api.lists.byId({ id: listId });
  if (!list) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Guided scan"
        title={list.name}
        description="One item at a time. Track cases/units and advance."
      />
      <ScanSession listId={list.id} initialItems={list.items} />
    </div>
  );
}

