import { type ReactNode } from "react";

import { cn } from "~/lib/utils";

interface PageHeaderProps {
  /** Tiny uppercase label rendered above the title — e.g. "Inventory". */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Right-aligned action slot — usually one or two buttons. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Top-of-page heading block. Used by every screen for visual consistency.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-muted text-xs font-semibold tracking-[0.12em] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-foreground mt-1 text-2xl leading-tight font-semibold tracking-tight sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
