import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-700 transition-colors",
  {
    variants: {
      variant: {
        default: "bg-chip text-navy",
        outline: "border border-hair text-ink2",
        success: "bg-success-bg text-success",
        warn: "bg-warn-bg text-warn",
        danger: "bg-danger-bg text-danger",
        navy: "bg-chip text-navy",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
