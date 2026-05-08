import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type Metadata } from "next";

import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";
import { BarcodeScanner } from "~/components/barcodes/barcode-scanner";

export const metadata: Metadata = { title: "Barcodes" };

export default function BarcodesPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Scan"
        title="Barcodes"
        description="Scan with your camera, save events, and regenerate barcode images."
        actions={
          <Button asChild variant="ghost">
            <Link href="/dashboard" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <BarcodeScanner />
    </div>
  );
}

