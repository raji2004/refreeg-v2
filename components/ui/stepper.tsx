import * as React from "react";

import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  status: "done" | "current" | "upcoming";
}

export interface StepperProps extends React.HTMLAttributes<HTMLOListElement> {
  steps: StepperStep[];
  /** Called with the 1-based step number when a completed step is clicked. */
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
        const selectable = step.status === "done" && !!onStepSelect;
        const content = (
          <>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                step.status === "done" &&
                  "border-lime bg-lime text-lime-foreground",
                step.status === "current" &&
                  "border-ink bg-ink text-ink-foreground",
                step.status === "upcoming" &&
                  "border-ink/20 bg-transparent text-ink/40",
                selectable && "group-hover:border-ink",
              )}
            >
              {step.status === "done" ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "label-eyebrow whitespace-nowrap",
                step.status === "upcoming" && "text-ink/30",
                selectable && "group-hover:text-ink",
              )}
            >
              {step.label}
            </span>
          </>
        );

        return (
          <li
            key={step.label}
            aria-current={step.status === "current" ? "step" : undefined}
            className="flex flex-1 items-center last:flex-none"
          >
            {selectable ? (
              <button
                type="button"
                onClick={() => onStepSelect(i + 1)}
                aria-label={`Go back to ${step.label}`}
                className="group flex flex-col items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {content}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">{content}</div>
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
