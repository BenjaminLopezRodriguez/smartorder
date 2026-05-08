import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "~/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "bg-surface border-border-strong text-foreground placeholder:text-muted",
        "h-11 w-full rounded-md border px-3.5 text-sm",
        "focus:border-brand focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
