import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground",
        outline: "border-border text-foreground",
        muted: "border-border bg-muted text-muted-foreground",
        solid: "border-foreground bg-foreground text-background",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
