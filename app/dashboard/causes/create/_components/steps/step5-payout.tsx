"use client";

import React, { useState } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Landmark,
  Shield,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NIGERIAN_BANKS = [
  "Zenith Bank",
  "Access Bank",
  "Guaranty Trust Bank (GTB)",
  "First Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Kuda Bank",
  "Fidelity Bank",
  "Stanbic IBTC Bank",
];

export function Step5Payout() {
  const { draft, updateDraft, nextStep, prevStep } = useCampaignFlow();
  const [trancheAgreed, setTrancheAgreed] = useState(draft.agreedToTranches);

  const handleBankChange = (bankName: string) => {
    updateDraft({ bankName });
  };

  const handleAccountNumChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    updateDraft({
      accountNumber: cleaned,
      accountName:
        cleaned.length === 10
          ? draft.accountName || "LADIPO MARKET TRADERS ASSOC"
          : draft.accountName,
    });
  };

  const handleAgreementToggle = (checked: boolean) => {
    setTrancheAgreed(checked);
    updateDraft({ agreedToTranches: checked });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
            Who receives the money
          </h2>
          <p className="text-sm text-[#6B7280]">
            Funds are held by RefreeG and released against receipts.
          </p>
        </div>

        {/* Security / Milestone Notice */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-4">
          <div className="rounded-lg bg-[#0B5D3B] p-1.5 text-white">
            <Shield className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0E1B14]">
              Milestone Escrow Protection
            </p>
            <p className="text-xs leading-relaxed text-[#6B7280]">
              To protect donor trust and prevent fraud, RefreeG holds disbursed
              funds until real milestone proof is verified.
            </p>
          </div>
        </div>

        {/* Bank & Account Fields */}
        <div className="mt-8 space-y-6">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            Account details
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                Bank
              </label>
              <select
                value={draft.bankName || "Zenith Bank"}
                onChange={(e) => handleBankChange(e.target.value)}
                className="w-full rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] px-4 py-3 text-sm font-semibold text-[#0E1B14] outline-none focus:border-[#0E1B14]"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#6B7280]">
                Account number
              </label>
              <input
                type="text"
                maxLength={10}
                value={draft.accountNumber}
                onChange={(e) => handleAccountNumChange(e.target.value)}
                placeholder="10-digit NUBAN"
                className="w-full font-mono rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] px-4 py-3 text-sm font-semibold text-[#0E1B14] outline-none focus:border-[#0E1B14]"
              />
            </div>
          </div>

          {/* Confirmed Account Name Display */}
          {draft.accountNumber && draft.accountNumber.length >= 10 && (
            <div className="rounded-2xl border border-[#EFEBE1] bg-[#F8F7F3] p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Account Name (Verified)
              </span>
              <p className="mt-1 font-mono text-sm font-bold text-[#0E1B14]">
                {draft.accountName || "LADIPO MARKET TRADERS ASSOC"}
              </p>
            </div>
          )}

          {/* Tranche Agreement Checkbox (Frame 86) */}
          <div className="mt-6 rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={trancheAgreed}
                onChange={(e) => handleAgreementToggle(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0E1B14] focus:ring-[#0E1B14]"
              />
              <span className="text-xs leading-relaxed text-[#0E1B14]">
                I understand money is released in tranches, each one against
                uploaded receipts.
              </span>
            </label>
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
            Back to photos
          </button>
          <button
            type="button"
            disabled={!trancheAgreed || !draft.accountNumber}
            onClick={nextStep}
            className="inline-flex items-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:opacity-40"
          >
            <span>Continue to proof</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
