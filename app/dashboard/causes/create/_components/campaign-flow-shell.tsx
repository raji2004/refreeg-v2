"use client";

import React from "react";
import { useCampaignFlow } from "./campaign-flow-provider";
import { CampaignFlowStepper } from "./campaign-flow-stepper";
import { Step1Cause } from "./steps/step1-cause";
import { Step2Story } from "./steps/step2-story";
import { Step3Target } from "./steps/step3-target";
import { Step4Photos } from "./steps/step4-photos";
import { Step5Payout } from "./steps/step5-payout";
import { Step6Proof } from "./steps/step6-proof";
import { Step7Review } from "./steps/step7-review";
import { Step8Live } from "./steps/step8-live";

export function CampaignFlowShell() {
  const { draft, isLoaded } = useCampaignFlow();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF9F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0E1B14] border-t-transparent" />
          <p className="text-xs font-medium text-[#6B7280]">
            Loading campaign draft...
          </p>
        </div>
      </div>
    );
  }

  const renderCurrentStep = () => {
    switch (draft.currentStep) {
      case 1:
        return <Step1Cause />;
      case 2:
        return <Step2Story />;
      case 3:
        return <Step3Target />;
      case 4:
        return <Step4Photos />;
      case 5:
        return <Step5Payout />;
      case 6:
        return <Step6Proof />;
      case 7:
        return <Step7Review />;
      case 8:
        return <Step8Live />;
      default:
        return <Step1Cause />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0E1B14]">
      {/* 8-Step Sticky Stepper Header */}
      <CampaignFlowStepper />

      {/* Main Step Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {renderCurrentStep()}
      </main>
    </div>
  );
}
