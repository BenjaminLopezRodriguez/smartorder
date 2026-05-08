import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type Metadata } from "next";

import { ImportOrderGuideForm } from "~/components/order-guides/import-order-guide-form";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = { title: "Import order guide" };

export default function ImportOrderGuidePage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Catalog"
        title="Import order guide"
        description="Upload or paste a CSV order sheet. Optionally attach a PDF or photo when blob storage is configured."
        actions={
          <Button asChild variant="ghost">
            <Link href="/order-guides" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />
      <ImportOrderGuideForm />
    </div>
  );
}
