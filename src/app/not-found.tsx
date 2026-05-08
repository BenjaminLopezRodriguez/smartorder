import Link from "next/link";
import { type Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import { EmptyState } from "~/components/ui/empty-state";

export const metadata: Metadata = { title: "Not Found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-2 pb-20 pt-10">
      <EmptyState
        title="Page not found"
        description="That page doesn’t exist, or it was moved."
        action={
          <Button asChild variant="secondary">
            <Link href="/dashboard" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        }
      />
    </div>
  );
}

