import { type Metadata } from "next";

import { CreateCatalogItemForm } from "~/components/catalog/create-catalog-item-form";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "New catalog item",
};

export default function NewCatalogItemPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader
        eyebrow="Catalog"
        title="Create a catalog item"
        description="Start simple: name + vendor + unit type. You can refine later."
      />
      <CreateCatalogItemForm />
    </div>
  );
}

