import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 text-white shadow-md hover:scale-[1.02] hover:shadow-lg",
        outline:
          "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
        ghost: "text-slate-700 hover:bg-slate-100",
        success: "bg-emerald-600 text-white hover:bg-emerald-500",
        danger: "bg-rose-600 text-white hover:bg-rose-500",
        warning: "bg-amber-500 text-slate-900 hover:bg-amber-400",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
