import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-soft text-primary-soft-foreground",
        mixed: "border-transparent bg-secondary-soft text-secondary-soft-foreground",
        topic: "border-transparent bg-primary-soft text-primary-soft-foreground",
        accent: "border-transparent bg-accent-soft text-accent-soft-foreground",
        played: "border-transparent bg-success-soft text-success-soft-foreground",
        danger: "border-transparent bg-danger-soft text-danger-soft-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
