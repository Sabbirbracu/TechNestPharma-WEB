import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-primary ring-primary/20",
        secondary: "border-secondary/30 bg-secondary text-secondary-foreground ring-secondary/30",
        outline: "border-border bg-card text-foreground ring-border/50",
        success: "border-success/20 bg-success/10 text-success ring-success/20",
        warning: "border-warning/20 bg-warning/10 text-warning-foreground ring-warning/20",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive ring-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
