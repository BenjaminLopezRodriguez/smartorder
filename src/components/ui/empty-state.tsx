import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "~/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "border-border bg-surface rounded-card flex flex-col items-center justify-center gap-3 border border-dashed p-8 text-center sm:p-10",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-surface-2 text-muted flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="max-w-sm">
        <p className="text-foreground text-sm font-semibold">{title}</p>
        {description ? (
          <p className="text-muted mt-1 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
