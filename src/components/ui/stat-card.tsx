import { type LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  /** Sub-label, e.g. "+12 this week". */
  hint?: string;
  /** Optional tone for the hint text. */
  hintTone?: "neutral" | "positive" | "negative";
  icon?: LucideIcon;
  className?: string;
}

/**
 * Dense KPI card used on the dashboard. Flat surface, no gradients.
 */
export function StatCard({
  label,
  value,
  hint,
  hintTone = "neutral",
  icon: Icon,
  className,
}: StatCardProps) {
  const hintColor = {
    neutral: "text-muted",
    positive: "text-success-foreground",
    negative: "text-danger-foreground",
  }[hintTone];

  return (
    <div
      className={cn(
        "bg-surface border-border rounded-card flex items-start justify-between gap-4 border p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-muted text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-foreground mt-2 text-2xl font-semibold tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className={cn("mt-1 text-xs", hintColor)}>{hint}</p>
        ) : null}
      </div>
      {Icon ? (
        <div className="bg-brand-soft text-brand-soft-foreground flex h-10 w-10 items-center justify-center rounded-md">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  );
}
