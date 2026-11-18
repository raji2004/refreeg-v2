import * as React from "react";

import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  status: "done" | "current" | "upcoming";
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** Makes completed steps clickable; receives the 1-based step number. */
  onStepSelect?: (step: number) => void;
}

const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  ({ steps, onStepSelect, className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn("flex w-full items-center", className)}
      {...props}
    >
      {steps.map((step, i) => {
        const marker = (
          <>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                step.status === "done" &&
                  "border-lime bg-lime text-lime-foreground",
                step.status === "current" &&
                  "border-ink bg-ink text-ink-foreground",
                step.status === "upcoming" &&
                  "border-ink/20 bg-transparent text-ink/40",
              )}
            >
              {step.status === "done" ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "label-eyebrow whitespace-nowrap",
                step.status === "upcoming" && "text-ink/30",
              )}
            >
              {step.label}
            </span>
          </>
        );

        return (
          <li
            key={step.label}
            className="flex flex-1 items-center last:flex-none"
            aria-current={step.status === "current" ? "step" : undefined}
          >
            {onStepSelect && step.status === "done" ? (
              <button
                type="button"
                onClick={() => onStepSelect(i + 1)}
                className="flex flex-col items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40"
              >
                {marker}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">{marker}</div>
            )}
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "mx-2 h-px flex-1",
                  step.status === "done" ? "bg-lime" : "bg-ink/15",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  ),
);
Stepper.displayName = "Stepper";

export { Stepper };
