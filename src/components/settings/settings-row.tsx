import { type ReactNode } from "react";

import { cn } from "~/lib/utils";

interface SettingsRowProps {
  label: string;
  description?: string;
  /** Right-side control — switch, button, badge, etc. */
  control?: ReactNode;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  control,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-foreground text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-muted mt-0.5 text-xs leading-snug">{description}</p>
        ) : null}
      </div>
      {control ? <div className="shrink-0">{control}</div> : null}
    </div>
  );
}

interface SettingsGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SettingsGroup({
  title,
  description,
  children,
  className,
}: SettingsGroupProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div>
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-muted mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      <div className="bg-surface border-border rounded-card divide-border divide-y border shadow-card">
        {children}
      </div>
    </section>
  );
}
