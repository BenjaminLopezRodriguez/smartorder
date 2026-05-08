import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { cn } from "~/lib/utils";

interface IconTileProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  href: string;
  /** Highlights the tile as the primary call to action on the screen. */
  emphasis?: boolean;
  className?: string;
}

/**
 * Quick-action tile used in the dashboard launchpad.
 * Big tap target, calm visual, single click to a workflow.
 */
export function IconTile({
  icon: Icon,
  label,
  description,
  href,
  emphasis = false,
  className,
}: IconTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group bg-surface border-border rounded-card flex h-full flex-col gap-3 border p-4 shadow-card transition-colors hover:border-border-strong",
        "focus-visible:border-brand focus-visible:outline-none",
        emphasis && "border-brand/30 bg-brand-soft/40 hover:border-brand/50",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md",
          emphasis
            ? "bg-brand text-brand-foreground"
            : "bg-brand-soft text-brand-soft-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{label}</p>
        {description ? (
          <p className="text-muted mt-0.5 text-xs leading-snug">{description}</p>
        ) : null}
      </div>
    </Link>
  );
}
