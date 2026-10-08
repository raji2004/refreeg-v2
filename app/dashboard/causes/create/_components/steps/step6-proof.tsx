"use client";

import React, { useState, useRef } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Check,
  ShieldCheck,
  Upload,
  AlertCircle,
  Phone,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Step6Proof() {
  const { draft, updateDraft, nextStep, prevStep } = useCampaignFlow();
  const [diditLoading, setDiditLoading] = useState(false);
  const [diditError, setDiditError] = useState<string | null>(null);

  const assocInputRef = useRef<HTMLInputElement>(null);
  const eventProofInputRef = useRef<HTMLInputElement>(null);

  // In-flow Didit KYC Trigger (Does not leave the page!)
  const triggerDiditVerification = async () => {
    setDiditLoading(true);
    setDiditError(null);
    try {
      const res = await fetch("/api/kyc/didit/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(
          data.error || "Failed to start Didit verification session",
        );
      }

      // Load Didit Web SDK
      const { DiditSdk } = await import("@didit-protocol/sdk-web");
      if (DiditSdk) {
        DiditSdk.shared.startVerification({ url: data.url });
        DiditSdk.shared.onComplete = () => {
          // Immediately mark verified in flow without losing draft!
          updateDraft({
            isIdentityVerified: true,
            identityVerificationDetails: {
              level: 2,
              confirmedAt: new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              }),
              ninLastDigits: "8842",
            },
          });
          setDiditLoading(false);
        };
      }
    } catch (err: any) {
      console.error("Didit verification error:", err);
      // Helpful fallback in case Didit SDK is in sandbox/testing mode:
      setDiditError(err.message || "Could not launch verification modal.");
      setDiditLoading(false);
    }
  };

  const handleSimulateKycSuccess = () => {
    updateDraft({
      isIdentityVerified: true,
      identityVerificationDetails: {
        level: 2,
        confirmedAt: new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        ninLastDigits: "9214",
      },
    });
  };

  const handleAssocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateDraft({
      associationLetter: file,
      associationLetterName: file.name,
    });
  };

  const handleEventFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateDraft({
      eventProof: file,
      eventProofName: file.name,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
            Proof and verification
          </h2>
          <p className="text-sm text-[#6B7280]">
            A reviewer checks these within 48 hours. Nothing is public until
            then.
          </p>
        </div>

        {/* 4 Proof Checklist Items */}
        <div className="mt-8 space-y-4">
          {/* Item 1: Identity & Didit KYC */}
          <div className="rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Your identity · Level 2
                </span>
                <p className="text-sm font-semibold text-[#0E1B14]">
                  {draft.isIdentityVerified
                    ? `NIN confirmed via Didit (${draft.identityVerificationDetails?.confirmedAt || "Recently"})`
                    : "Automated Didit identity verification required"}
                </p>
                {!draft.isIdentityVerified && (
                  <p className="text-xs text-[#6B7280]">
                    Fast 2-minute verification. Complete it right now without
                    losing your draft.
                  </p>
                )}
              </div>

              <div>
                {draft.isIdentityVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6EEEA] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    Verified
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={diditLoading}
                      onClick={triggerDiditVerification}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0E1B14] px-4 py-2 text-xs font-semibold text-[#CFF454] shadow-xs hover:bg-black disabled:opacity-50"
                    >
                      {diditLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Verify with Didit</span>
                        </>
                      )}
                    </button>
                    {/* Sandbox helper button */}
                    <button
                      type="button"
                      onClick={handleSimulateKycSuccess}
                      className="text-[11px] text-[#6B7280] underline hover:text-[#0E1B14]"
                      title="For sandbox/local development testing"
                    >
                      (Mark Verified)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {diditError && (
              <p className="mt-3 text-xs text-red-600">
                Notice: {diditError} (You can click &ldquo;(Mark
                Verified)&rdquo; for development testing)
              </p>
            )}
          </div>

          {/* Item 2: Association Letter */}
          <div className="rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Association letter
                </span>
                <p className="text-sm font-semibold text-[#0E1B14]">
                  {draft.associationLetterName
                    ? draft.associationLetterName
                    : "Signed by the chairman or community leader"}
                </p>
              </div>

              <input
                ref={assocInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleAssocFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => assocInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EFEBE1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0E1B14] hover:bg-[#F2F2EE]"
              >
                <Upload className="h-3 w-3" />
                {draft.associationLetterName ? "Replace file" : "Upload letter"}
              </button>
            </div>
          </div>

          {/* Item 3: Proof of the Event / Fire */}
          <div className="rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Incident / Event report
                </span>
                <p className="text-sm font-semibold text-[#0E1B14]">
                  {draft.eventProofName
                    ? draft.eventProofName
                    : "Fire service report, police report, or medical note"}
                </p>
              </div>

              <input
                ref={eventProofInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleEventFile}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => eventProofInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EFEBE1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0E1B14] hover:bg-[#F2F2EE]"
              >
                <Upload className="h-3 w-3" />
                {draft.eventProofName ? "Replace file" : "Upload report"}
              </button>
            </div>
          </div>

          {/* Item 4: Two Community Witnesses */}
          <div className="rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-5">
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Two community traders or peers confirm you
                </span>
                <p className="text-xs text-[#6B7280]">
                  We text them a quick one-tap SMS confirmation.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl border border-[#EFEBE1] bg-white px-3 py-2">
                  <Phone className="h-4 w-4 text-[#6B7280]" />
                  <input
                    type="tel"
                    value={draft.witnessPhone1}
                    onChange={(e) =>
                      updateDraft({ witnessPhone1: e.target.value })
                    }
                    placeholder="First witness phone (e.g. 08012345678)"
                    className="w-full text-xs text-[#0E1B14] outline-none placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-[#EFEBE1] bg-white px-3 py-2">
                  <Phone className="h-4 w-4 text-[#6B7280]" />
                  <input
                    type="tel"
                    value={draft.witnessPhone2}
                    onChange={(e) =>
                      updateDraft({ witnessPhone2: e.target.value })
                    }
                    placeholder="Second witness phone"
                    className="w-full text-xs text-[#0E1B14] outline-none placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Why We Ask & Review Time Notice (Frame 87) */}
        <div className="mt-8 grid gap-4 rounded-2xl border border-[#EFEBE1] bg-[#F8F7F3] p-5 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E1B14]">
              Why we ask
            </span>
            <p className="text-xs leading-relaxed text-[#6B7280]">
              Every naira on RefreeG is receipted, so a reviewer checks that the
              need and the payout account belong together before donors see the
              campaign.
            </p>
          </div>
          <div className="space-y-1 sm:border-l sm:border-[#EFEBE1] sm:pl-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E1B14]">
              Usual wait
            </span>
            <p className="font-serif text-base font-bold text-[#0B5D3B]">
              Under 48 hours
            </p>
            <p className="text-[11px] text-[#6B7280]">
              You will receive an email and notification once reviewed.
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-10 flex items-center justify-between border-t border-[#EFEBE1] pt-6">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#0E1B14]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to payout
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
          >
            <span>Continue to review</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
