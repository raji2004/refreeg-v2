"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Stepper } from "@/components/ui/stepper";
import { causeSteps } from "@/lib/options/cause.options";
import { LAST_CAUSE_STEP } from "@/hooks/use-cause-form";

type StepMeta = { title: string; description: string };

type Props = {
  title: string;
  description: string;
  stepMeta: readonly StepMeta[];
  currentStep: number;
  onStepSelect: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel: string;
  busyLabel: string;
  busy: boolean;
  children: ReactNode;
};

/** Shared frame for the create and edit cause wizards. */
export function CauseWizard({
  title,
  description,
  stepMeta,
  currentStep,
  onStepSelect,
  onBack,
  onNext,
  onSubmit,
  submitLabel,
  busyLabel,
  busy,
  children,
}: Props) {
  const flowTopRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(currentStep);
  const activeStep = stepMeta[currentStep - 1];

  useEffect(() => {
    if (previousStepRef.current === currentStep) return;
    previousStepRef.current = currentStep;
    window.requestAnimationFrame(() => {
      flowTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [currentStep]);

  return (
    <div className="min-h-screen w-full bg-cream px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>Campaign builder</Eyebrow>
            <h1 className="mt-2 font-fraunces text-3xl font-medium text-ink sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
              {description}
            </p>
          </div>
          <p className="inline-flex w-fit items-center gap-2 text-xs font-medium text-ink/60">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" />
            Draft saves automatically
          </p>
        </header>

        <div ref={flowTopRef} className="scroll-mt-28 space-y-6">
          <div className="overflow-x-auto pb-1">
            <Stepper
              className="min-w-[520px]"
              steps={causeSteps.map((label, i) => ({
                label,
                status:
                  i + 1 < currentStep
                    ? "done"
                    : i + 1 === currentStep
                      ? "current"
                      : "upcoming",
              }))}
              onStepSelect={onStepSelect}
            />
          </div>

          <Card variant="surface" className="overflow-hidden shadow-none">
            <div className="border-b border-hairline bg-bone px-4 py-5 sm:p-6">
              <Eyebrow>
                Step {currentStep} of {LAST_CAUSE_STEP} ·{" "}
                {causeSteps[currentStep - 1]}
              </Eyebrow>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-fraunces text-2xl font-medium text-ink">
                    {activeStep.title}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
                    {activeStep.description}
                  </p>
                </div>
                <Badge variant="forest" className="w-fit shrink-0 gap-1.5">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Milestone protected
                </Badge>
              </div>
            </div>

            <form
              className="cause-flow space-y-6 px-4 py-5 sm:space-y-8 sm:p-6"
              autoComplete="off"
              onKeyDown={(e) => {
                if (
                  currentStep === LAST_CAUSE_STEP &&
                  e.key === "Enter" &&
                  e.target instanceof HTMLElement &&
                  e.target.tagName !== "TEXTAREA" &&
                  e.target.tagName !== "BUTTON"
                ) {
                  e.preventDefault();
                }
              }}
            >
              <div className="min-h-[320px] sm:min-h-[400px]">
                <div
                  key={currentStep}
                  className="animate-in fade-in duration-200"
                >
                  {children}
                </div>
              </div>

              <div className="sticky bottom-0 z-10 -mx-4 -mb-5 flex items-center justify-between gap-3 border-t border-hairline bg-surface px-4 py-4 sm:static sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-5">
                <Button
                  type="button"
                  variant="surface"
                  onClick={onBack}
                  disabled={currentStep === 1}
                  className="h-11 px-4 sm:px-5"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                {currentStep < LAST_CAUSE_STEP ? (
                  <Button
                    type="button"
                    variant="ink"
                    onClick={onNext}
                    className="h-11 px-5 sm:px-7"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="lime"
                    disabled={busy}
                    onClick={onSubmit}
                    className="h-11 px-5 sm:px-7"
                  >
                    {busy ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        {busyLabel}
                      </>
                    ) : (
                      submitLabel
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
