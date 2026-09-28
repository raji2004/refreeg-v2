"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> {
  indicatorVariant?: "default" | "cyan" | "forest" | "lime" | "blue";
  indicatorClassName?: string;
}

const indicatorVariants: Record<string, string> = {
  default: "bg-blue-700",
  cyan: "bg-cyan",
  forest: "bg-forest",
  lime: "bg-lime",
  blue: "bg-blue-accent",
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(
  (
    {
      className,
      value,
      indicatorVariant = "default",
      indicatorClassName,
      ...props
    },
    ref,
  ) => {
    // Radix errors on values outside 0–100.
    const clamped = value == null ? value : Math.min(100, Math.max(0, value));
    const labelled = props["aria-label"] || props["aria-labelledby"];

    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={clamped}
        aria-label={
          labelled ? undefined : `${Math.round(clamped ?? 0)}% complete`
        }
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all",
            indicatorVariants[indicatorVariant] || indicatorVariants.default,
            indicatorClassName,
          )}
          style={{ transform: `translateX(-${100 - (clamped || 0)}%)` }}
        />
      </ProgressPrimitive.Root>
    );
  },
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
