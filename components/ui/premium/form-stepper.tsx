"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormStepperProps {
  steps: string[];
  currentStep: number;
  variant?: "premium" | "refreeg";
  onStepSelect?: (step: number) => void;
}

export function FormStepper({
  steps,
  currentStep,
  variant = "premium",
  onStepSelect,
}: FormStepperProps) {
  if (variant === "refreeg") {
    const progress = Math.round((currentStep / steps.length) * 100);

    return (
      <aside className="rounded-2xl bg-[#10233F] text-white shadow-[0_18px_40px_-30px_rgba(16,35,63,0.9)]">
        <div className="px-3 py-4 sm:p-4 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A9B8CA]">
                Step {currentStep} of {steps.length}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {steps[currentStep - 1]}
              </p>
            </div>
            <span className="rounded-lg bg-[#D9FF5B] px-2.5 py-1 text-xs font-extrabold text-[#10233F]">
              {progress}%
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#D9FF5B] transition-[width] duration-200"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>

        <div className="hidden grid-cols-[180px_minmax(0,1fr)] items-stretch gap-4 p-4 lg:grid">
          <div className="flex flex-col justify-center border-r border-white/10 pr-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9FB0C5]">
              Campaign setup
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <span className="text-3xl font-extrabold text-white">
                  {currentStep}
                </span>
                <span className="text-sm font-semibold text-[#9FB0C5]">
                  /{steps.length}
                </span>
              </div>
              <span className="pb-1 text-xs font-bold text-[#D9FF5B]">
                {progress}%
              </span>
            </div>
          </div>

          <ol className="grid grid-cols-5 gap-2">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isCompleted = currentStep > stepNumber;
              const isActive = currentStep === stepNumber;

              return (
                <li key={step}>
                  <button
                    type="button"
                    disabled={!isCompleted || !onStepSelect}
                    onClick={() => onStepSelect?.(stepNumber)}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={
                      isCompleted ? `Go back to ${step}` : undefined
                    }
                  className={cn(
                      "flex h-full w-full min-w-0 items-center gap-2 rounded-xl px-3 py-3 text-left text-xs font-semibold",
                    isActive
                      ? "bg-white text-[#10233F]"
                      : "bg-white/[0.045] text-[#B8C5D5]",
                      isCompleted &&
                        onStepSelect &&
                        "cursor-pointer hover:bg-white/15 hover:text-white",
                  )}
                  >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold",
                      isCompleted && "bg-[#D9FF5B] text-[#10233F]",
                      isActive && "bg-[#235DA7] text-white",
                      !isCompleted && !isActive && "bg-white/10 text-[#B8C5D5]",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      stepNumber
                    )}
                  </span>
                  <span className="truncate">{step}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    );
  }

  return (
    <div className="mx-auto mb-6 w-full max-w-4xl px-0 sm:mb-8 md:mb-12 md:px-4">
      {/* Mobile Step Indicator (Simplified) */}
      <div className="mb-5 flex items-start justify-between gap-3 md:hidden">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-brand">
            Step {currentStep} of {steps.length}
          </span>
          <span className="max-w-[140px] text-sm font-semibold text-gray-900">
            {steps[currentStep - 1]}
          </span>
        </div>
        <div className="flex flex-1 justify-end gap-1.5 pt-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 min-w-0 flex-1 rounded-full transition-all duration-300",
                currentStep === index + 1
                  ? "bg-brand"
                  : currentStep > index + 1
                    ? "bg-brand/40"
                    : "bg-gray-100",
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop/Tablet Step Indicator (Full) */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <div
              key={step}
              className="flex flex-col items-center relative flex-1"
            >
              {/* Line between steps */}
              {index > 0 && (
                <div className="absolute top-5 -left-1/2 w-full h-[2px] bg-gray-100 -z-10">
                  <motion.div
                    className="h-full bg-brand"
                    initial={{ width: "0%" }}
                    animate={{ width: isCompleted || isActive ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              )}

              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                  isCompleted
                    ? "bg-brand border-brand text-white"
                    : isActive
                      ? "bg-white border-brand text-brand ring-4 ring-brand/10"
                      : "bg-white border-gray-200 text-gray-400",
                )}
                initial={false}
                animate={isActive ? { scale: 1.15 } : { scale: 1 }}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-semibold">{stepNumber}</span>
                )}
              </motion.div>

              <span
                className={cn(
                  "mt-3 text-xs font-medium transition-colors duration-300 text-center px-1",
                  isActive ? "text-brand" : "text-gray-500",
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
