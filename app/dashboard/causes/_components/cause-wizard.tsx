"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { FormStepper } from "@/components/ui/premium/form-stepper";
import { PremiumFormContainer } from "@/components/ui/premium/premium-form-container";
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
    <PremiumFormContainer
      title={title}
      description={description}
      variant="refreeg"
    >
      <div ref={flowTopRef} className="scroll-mt-28 space-y-4">
        <FormStepper
          steps={causeSteps}
          currentStep={currentStep}
          variant="refreeg"
          onStepSelect={(step) => {
            if (step < currentStep) onStepSelect(step);
          }}
        />

        <section className="overflow-hidden rounded-2xl border border-[#D6DEE7] bg-white shadow-[0_18px_45px_-38px_rgba(16,35,63,0.55)]">
          <div className="border-b border-[#E1E7ED] bg-[#FBFCFD] px-3 py-4 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-steel">
              {causeSteps[currentStep - 1]}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-0.015em] text-navy-ink sm:text-2xl">
                  {activeStep.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-steel">
                  {activeStep.description}
                </p>
              </div>
              <div className="inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-[#C9D9E8] bg-[#EEF5FB] px-3 py-2 text-[10px] font-bold text-[#274C72]">
                <LockKeyhole className="h-3.5 w-3.5" />
                Milestone protected
              </div>
            </div>
          </div>

          <form
            className="cause-flow space-y-6 px-3 py-4 sm:space-y-8 sm:p-6"
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

            <div className="sticky bottom-0 z-10 -mx-3 -mb-4 flex items-center justify-between gap-3 border-t border-mist bg-white px-3 py-4 sm:static sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-5">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={currentStep === 1}
                className="h-11 rounded-xl border-mist-light bg-white px-4 font-bold text-navy-ink shadow-none hover:border-[#9FB1C5] hover:bg-[#F8FAFC] hover:text-navy-ink disabled:!border-mist-light disabled:!bg-[#F4F6F8] disabled:!text-[#8795A8] disabled:opacity-100 sm:px-5"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-3">
                {currentStep < LAST_CAUSE_STEP ? (
                  <Button
                    type="button"
                    onClick={onNext}
                    className="h-11 rounded-xl bg-blue-steel px-5 font-bold text-white shadow-none hover:bg-[#1B4E8C] sm:px-7"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={onSubmit}
                    className="h-11 rounded-xl bg-blue-steel px-5 font-bold text-white shadow-none hover:bg-[#1B4E8C] sm:px-7"
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
            </div>
          </form>
        </section>
      </div>
    </PremiumFormContainer>
  );
}
