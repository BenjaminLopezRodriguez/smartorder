import { type Metadata } from "next";

import { CreateListForm } from "~/components/lists/create-list-form";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "New list",
};

export default function NewListPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        eyebrow="Workflows"
        title="Create a list"
        description="Start with a name, then add items from the catalog."
      />
      <CreateListForm />
    </div>
  );
}

