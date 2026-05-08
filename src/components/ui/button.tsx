import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "~/lib/utils";

/**
 * SmartOrder Button primitive.
 * Variants are deliberately limited to keep the operational UI calm and predictable.
 * Sizes default to large tap targets (warehouse / one-handed friendly).
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
    "rounded-md transition-colors select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-foreground shadow-flat hover:bg-brand-hover active:bg-brand-hover",
        secondary:
          "bg-surface text-foreground border border-border-strong hover:bg-surface-2",
        ghost: "text-foreground hover:bg-surface-2",
        soft: "bg-brand-soft text-brand-soft-foreground hover:bg-brand-soft/70",
        danger:
          "bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface-2",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-[15px]",
        xl: "h-14 px-6 text-base",
        icon: "h-10 w-10 p-0",
        "icon-lg": "h-12 w-12 p-0",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
