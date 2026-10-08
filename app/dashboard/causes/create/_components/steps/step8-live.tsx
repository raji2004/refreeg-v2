"use client";

import React, { useState } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Share2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export function Step8Live() {
  const { draft } = useCampaignFlow();
  const [copied, setCopied] = useState(false);

  const campaignSlug = draft.publishedSlug || "ladipo-42-stalls";
  const campaignUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/causes/${campaignSlug}`
      : `https://refreeg.org/c/${campaignSlug}`;

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-3xl border border-[#EFEBE1] bg-white p-8 text-center shadow-sm sm:p-12">
        {/* Success Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E6EEEA] text-[#0B5D3B]">
          <Check className="h-8 w-8 stroke-[3]" />
        </div>

        {/* Title */}
        <h2 className="mt-6 font-serif text-3xl font-bold tracking-tight text-[#0E1B14] sm:text-4xl">
          Your campaign is live
        </h2>
        <p className="mt-2 text-sm text-[#6B7280]">
          {campaignUrl} · reviewed and published this morning
        </p>

        {/* Shareable Link Box */}
        <div className="mt-8 flex items-center justify-between gap-2 rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-2 sm:p-3">
          <span className="truncate px-2 text-xs font-mono font-medium text-[#0E1B14]">
            {campaignUrl}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E1B14] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[3]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* AI First Update Banner (Frame 89) */}
        <div className="mt-8 rounded-2xl border border-[#EFEBE1] bg-[#F8F7F3] p-6 text-left">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#0E1B14] p-1.5 text-[#CFF454]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#0E1B14]">
                Want the first update drafted?
              </h4>
              <p className="text-xs leading-relaxed text-[#6B7280]">
                Campaigns that post within 48 hours raise about a third more.
              </p>
              <div className="pt-2">
                <Link
                  href={`/dashboard/causes`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B5D3B] hover:underline"
                >
                  <span>Draft first post now</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/causes/${campaignSlug}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black sm:w-auto"
          >
            <span>View public campaign</span>
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/causes"
            className="inline-flex w-full items-center justify-center rounded-full border border-[#EFEBE1] bg-white px-6 py-3 text-sm font-semibold text-[#0E1B14] hover:bg-[#FAF9F6] sm:w-auto"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
