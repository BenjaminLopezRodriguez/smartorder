"use client";

import { AlertTriangle } from "lucide-react";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  return (
    <div className="border-border bg-surface rounded-card flex flex-col items-center gap-4 border border-dashed p-8 text-center">
      <div className="bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div>
        <p className="text-foreground text-sm font-semibold">Something went wrong</p>
        <p className="text-muted mt-1 text-sm">
          {error.message ?? "An unexpected error occurred."}
        </p>
      </div>
      <button
        onClick={reset}
        className="bg-brand text-brand-foreground rounded-lg px-5 py-2.5 text-sm font-semibold"
      >
        Try again
      </button>
    </div>
  );
}
