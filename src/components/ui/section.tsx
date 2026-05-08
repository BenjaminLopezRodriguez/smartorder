import { type ReactNode } from "react";

import { cn } from "~/lib/utils";

interface SectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Page-level section block — title row + content slot. Use for grouping cards
 * inside a screen ("Quick actions", "Recent lists", …).
 */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: SectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-foreground text-sm font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-muted mt-0.5 text-xs">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
