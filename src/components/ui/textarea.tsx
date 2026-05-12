import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "~/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "bg-surface border-border-strong text-foreground placeholder:text-muted",
        "w-full rounded-md border px-3.5 py-2.5 text-sm",
        "focus:border-brand focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "resize-none",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
