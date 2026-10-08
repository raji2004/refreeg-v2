"use client";

import React from "react";
import { useCampaignFlow } from "./campaign-flow-provider";
import { CampaignStep } from "./types";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const STEPS: { number: CampaignStep; label: string }[] = [
  { number: 1, label: "Cause" },
  { number: 2, label: "Story" },
  { number: 3, label: "Target" },
  { number: 4, label: "Photos" },
  { number: 5, label: "Payout" },
  { number: 6, label: "Proof" },
  { number: 7, label: "Review" },
  { number: 8, label: "Live" },
];

export function CampaignFlowStepper() {
  const { draft, goToStep } = useCampaignFlow();
  const router = useRouter();
  const current = draft.currentStep as CampaignStep;
  const progressPercent = Math.round((current / STEPS.length) * 100);

  const handleSaveAndExit = () => {
    router.push("/dashboard/causes");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#EFEBE1] bg-[#FAF9F6]/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E1B14] text-white">
            <span className="font-serif text-sm font-bold">R</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#0E1B14] sm:text-base">
              Create a campaign
            </h1>
            <p className="hidden text-xs text-[#6B7280] sm:block">
              RefreeG verified campaign builder
            </p>
          </div>
        </div>

        {/* Center: Desktop 8-Step Navigation */}
        <nav
          aria-label="Campaign creation steps"
          className="hidden lg:flex items-center gap-1 xl:gap-2"
        >
          {STEPS.map((step) => {
            const isActive = step.number === current;
            const isCompleted =
              step.number < current || (step.number === 8 && current === 8);
            const isAccessible = step.number <= draft.lastCompletedStep;

            return (
              <button
                key={step.number}
                type="button"
                disabled={!isAccessible && step.number > current}
                onClick={() => isAccessible && goToStep(step.number)}
                className={cn(
                  "group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-[#0E1B14] text-white shadow-sm"
                    : isCompleted
                      ? "text-[#0B5D3B] hover:bg-[#EFEBE1]/60"
                      : "text-[#6B7280] hover:text-[#0E1B14] disabled:opacity-40 disabled:hover:text-[#6B7280]",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                    isActive
                      ? "bg-[#CFF454] text-[#0E1B14]"
                      : isCompleted
                        ? "bg-[#0B5D3B] text-white"
                        : "bg-[#EFEBE1] text-[#6B7280]",
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  ) : (
                    step.number
                  )}
                </span>
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Save & Exit */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAndExit}
            className="text-xs font-medium text-[#6B7280] transition-colors hover:text-[#0E1B14] sm:text-sm"
          >
            Save and exit
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Compact Progress Track */}
      <div className="block lg:hidden border-t border-[#EFEBE1]/60 bg-white/70 px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-[#0E1B14]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0E1B14] text-[10px] font-bold text-[#CFF454]">
              {current}
            </span>
            <span>{STEPS[current - 1]?.label}</span>
            <span className="text-gray-400">·</span>
            <span className="text-[#6B7280]">Step {current} of 8</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#0B5D3B]">
            {progressPercent}%
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#EFEBE1]">
          <div
            className="h-full rounded-full bg-[#0B5D3B] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </header>
  );
}
