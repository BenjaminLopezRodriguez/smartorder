import { type HTMLAttributes } from "react";

import { cn } from "~/lib/utils";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "border-border bg-surface text-muted-foreground inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium",
        className,
      )}
      {...props}
    />
  );
}
