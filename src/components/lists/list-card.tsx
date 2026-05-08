import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";

import { Badge } from "~/components/ui/badge";

export interface ListSummary {
  id: string;
  name: string;
  itemCount: number;
  scannedCount: number;
  status: "draft" | "scanning" | "review" | "complete";
  updatedLabel: string;
  /** "Bakery, Cleaning, Paper" — short signal for the list contents. */
  contentSummary?: string;
}

interface ListCardProps {
  list: ListSummary;
}

const STATUS_TONE: Record<
  ListSummary["status"],
  { label: string; tone: "neutral" | "brand" | "warning" | "success" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  scanning: { label: "Scanning", tone: "brand" },
  review: { label: "Review", tone: "warning" },
  complete: { label: "Complete", tone: "success" },
};

export function ListCard({ list }: ListCardProps) {
  const status = STATUS_TONE[list.status];
  const progress =
    list.itemCount === 0
      ? 0
      : Math.min(100, Math.round((list.scannedCount / list.itemCount) * 100));

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group bg-surface border-border rounded-card hover:border-border-strong block border p-4 shadow-card transition-colors sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-brand-soft text-brand-soft-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
            <ListChecks className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground truncate text-sm font-semibold sm:text-[15px]">
              {list.name}
            </h3>
            <p className="text-muted mt-0.5 text-xs">{list.updatedLabel}</p>
          </div>
        </div>
        <Badge tone={status.tone} size="sm">
          {status.label}
        </Badge>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-foreground text-2xl font-semibold tabular-nums">
            {list.scannedCount}
            <span className="text-muted text-sm font-medium">
              {" / "}
              {list.itemCount}
            </span>
          </p>
          <p className="text-muted mt-0.5 text-xs">
            {list.contentSummary ?? "Mixed inventory"}
          </p>
        </div>
        <ChevronRight className="text-muted h-4 w-4 self-end transition-transform group-hover:translate-x-0.5" />
      </div>

      <div
        className="bg-surface-2 mt-3 h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-brand h-full rounded-full transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </Link>
  );
}
