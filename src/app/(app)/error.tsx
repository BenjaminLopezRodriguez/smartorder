"use client";

import { RouteError } from "~/components/ui/route-error";

export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <RouteError error={error} reset={reset} />
      </div>
    </div>
  );
}
