"use client";

import React, { useState } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_PIDGIN =
  "As di fire enter Ladipo market for 18 December, forty-two market women lose everything wey dem take dey trade. ₦180k dey restock one complete stall wit foodstuff and table.";

export function Step2Story() {
  const {
    draft,
    updateDraft,
    nextStep,
    prevStep,
    addStorySection,
    updateStorySection,
    removeStorySection,
    applySuggestedParagraph,
    discardSuggestedParagraph,
  } = useCampaignFlow();

  const [isGenerating, setIsGenerating] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Compute word count and read time
  const totalWords = draft.sections.reduce((acc, s) => {
    return (
      acc +
      (s.description
        ? s.description.trim().split(/\s+/).filter(Boolean).length
        : 0)
    );
  }, 0);
  const readTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

  // Quick AI Assistant Actions
  const handleQuickAiAction = async (
    actionType: "pidgin" | "shorter" | "contingency" | "title",
  ) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/campaign-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          title: draft.title,
          story: draft.sections.map((s) => s.description).join("\n\n"),
          category: draft.category,
          location: draft.fullLocation,
        }),
      });
      const data = await res.json();
      if (data.success && data.suggestion) {
        if (actionType === "title") {
          updateDraft({ title: data.suggestion });
        } else {
          updateDraft({
            suggestedParagraph: data.suggestion,
            suggestedParagraphContext: data.context,
          });
        }
      } else {
        throw new Error(data.error || "Fallback to client templates");
      }
    } catch {
      // Local fallback
      if (actionType === "pidgin") {
        updateDraft({
          suggestedParagraph: SAMPLE_PIDGIN,
          suggestedParagraphContext:
            "Drafted in Nigerian Pidgin to connect with grassroots donors.",
        });
      } else if (actionType === "shorter") {
        if (draft.sections.length > 0) {
          const shortened =
            draft.sections[0].description.split(". ").slice(0, 2).join(". ") +
            ".";
          updateDraft({
            suggestedParagraph: shortened,
            suggestedParagraphContext: "Tighter, punchier opening paragraph.",
          });
        }
      } else if (actionType === "contingency") {
        updateDraft({
          suggestedParagraph:
            "If we raise less than the full amount, we will restock in priority order as verified by the market association and publicly post receipts for every stall reopened. No gift is wasted or left in limbo.",
          suggestedParagraphContext:
            "Donors ask what happens if you only raise half.",
        });
      } else if (actionType === "title") {
        updateDraft({
          title: "Restock 42 Ladipo market stalls after the December fire",
        });
      }
    } finally {
      setIsGenerating(false);
      setMobileDrawerOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ================= LEFT: MAIN STORY EDITOR ================= */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
                Title and story
              </h2>
              <p className="text-sm text-[#6B7280]">
                Donors read the first two lines. Say who, what and how much.
              </p>
            </div>

            {/* Campaign Title Input */}
            <div className="mt-8 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Title
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickAiAction("title")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B5D3B] hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Draft with AI
                </button>
              </div>
              <input
                type="text"
                maxLength={60}
                value={draft.title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="Give your campaign a clear, specific title"
                className="w-full rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] px-4 py-3 text-base font-semibold text-[#0E1B14] outline-none focus:border-[#0E1B14] focus:ring-1 focus:ring-[#0E1B14]"
              />
              <div className="flex justify-end">
                <span className="text-[11px] text-[#6B7280]">
                  {draft.title.length} of 60 characters
                </span>
              </div>
            </div>

            {/* Inline AI Suggested Paragraph (Frame 83) */}
            {draft.suggestedParagraph && (
              <div className="my-6 rounded-2xl border border-[#CFF454] bg-[#F9FDE8] p-5 shadow-sm transition-all">
                <div className="flex items-center justify-between pb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0E1B14]">
                    <Sparkles className="h-3.5 w-3.5 text-[#0B5D3B]" />
                    Suggested Paragraph
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    Waiting for your review
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-[#0E1B14]">
                  &ldquo;{draft.suggestedParagraph}&rdquo;
                </p>
                {draft.suggestedParagraphContext && (
                  <p className="mt-2 text-xs italic text-[#6B7280]">
                    Reason: {draft.suggestedParagraphContext}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[#EFEBE1]/80">
                  <button
                    type="button"
                    onClick={() => applySuggestedParagraph(0)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#0E1B14] px-3.5 py-1.5 text-xs font-semibold text-[#CFF454] hover:bg-black"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                    Keep it
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAiAction("shorter")}
                    className="rounded-full border border-[#EFEBE1] bg-white px-3 py-1.5 text-xs font-medium text-[#0E1B14] hover:bg-[#F2F2EE]"
                  >
                    Rewrite shorter
                  </button>
                  <button
                    type="button"
                    onClick={discardSuggestedParagraph}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:text-red-600"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Story Sections */}
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  The Story
                </label>
                <span className="text-xs text-[#6B7280]">
                  {totalWords} words · reads in about {readTimeMinutes} min
                </span>
              </div>

              {draft.sections.map((section, idx) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-4 transition-all focus-within:border-[#0E1B14] focus-within:bg-white"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <input
                      type="text"
                      value={section.heading}
                      onChange={(e) =>
                        updateStorySection(
                          section.id,
                          e.target.value,
                          section.description,
                        )
                      }
                      placeholder={`Section ${idx + 1} Heading (e.g. Why this matters)`}
                      className="bg-transparent text-xs font-bold uppercase tracking-wider text-[#0E1B14] outline-none"
                    />
                    {draft.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStorySection(section.id)}
                        className="text-xs text-[#6B7280] hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={section.description}
                    onChange={(e) =>
                      updateStorySection(
                        section.id,
                        section.heading,
                        e.target.value,
                      )
                    }
                    placeholder="Tell your story clearly so donors understand the impact of their gift..."
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-[#0E1B14] outline-none placeholder-gray-400"
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => addStorySection("Next step")}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#EFEBE1] px-4 py-2 text-xs font-semibold text-[#0E1B14] hover:border-[#0E1B14] hover:bg-[#FAF9F6]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add a section
              </button>
            </div>

            {/* Mobile AI Drawer Toggle Button */}
            <div className="mt-8 block lg:hidden">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#CFF454] bg-[#F9FDE8] p-3 text-xs font-bold text-[#0E1B14] shadow-sm"
              >
                <Sparkles className="h-4 w-4 text-[#0B5D3B]" />
                Open AI Writing Help & Suggestions
              </button>
            </div>

            {/* Bottom Stepper Buttons */}
            <div className="mt-10 flex items-center justify-between border-t border-[#EFEBE1] pt-6">
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#0E1B14]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to cause
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
              >
                <span>Continue to target</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= RIGHT RAIL (DESKTOP) / DRAWER (MOBILE): AI WRITING HELP ================= */}
        <aside
          className={cn(
            "space-y-6 lg:block",
            mobileDrawerOpen
              ? "fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-4 backdrop-blur-sm lg:static lg:bg-transparent lg:p-0"
              : "hidden lg:block",
          )}
        >
          <div className="max-h-[90vh] overflow-y-auto rounded-3xl border border-[#EFEBE1] bg-[#FAF9F6] p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0E1B14] text-[#CFF454]">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0E1B14]">
                    Writing help
                  </h3>
                  <p className="text-[11px] text-[#6B7280]">
                    Reads your draft as you type
                  </p>
                </div>
              </div>
              {mobileDrawerOpen && (
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-200 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Proactive Suggestion Card */}
            <div className="mt-6 rounded-2xl border border-[#EFEBE1] bg-white p-4 shadow-xs">
              <p className="text-xs leading-relaxed text-[#0E1B14]">
                Your opening is strong. Donors also want to know what happens if
                you only raise half.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickAiAction("contingency")}
                  className="rounded-full bg-[#0E1B14] px-3 py-1 text-xs font-semibold text-[#CFF454] hover:bg-black"
                >
                  Add that paragraph
                </button>
                <button
                  type="button"
                  onClick={() => discardSuggestedParagraph()}
                  className="text-xs text-[#6B7280] hover:text-[#0E1B14]"
                >
                  Not now
                </button>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="mt-6 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Quick Draft Prompts
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleQuickAiAction("shorter")}
                  className="w-full rounded-xl border border-[#EFEBE1] bg-white px-3 py-2 text-left text-xs font-medium text-[#0E1B14] hover:border-[#0E1B14] hover:bg-[#F2F2EE]"
                >
                  Make the second paragraph shorter
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleQuickAiAction("pidgin")}
                  className="w-full rounded-xl border border-[#EFEBE1] bg-white px-3 py-2 text-left text-xs font-medium text-[#0E1B14] hover:border-[#0E1B14] hover:bg-[#F2F2EE]"
                >
                  Write it in Nigerian Pidgin as well
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleQuickAiAction("title")}
                  className="w-full rounded-xl border border-[#EFEBE1] bg-white px-3 py-2 text-left text-xs font-medium text-[#0E1B14] hover:border-[#0E1B14] hover:bg-[#F2F2EE]"
                >
                  Suggest a title that names the number
                </button>
              </div>
            </div>

            {/* Missing Info Checklist */}
            <div className="mt-6 space-y-2 border-t border-[#EFEBE1] pt-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                Still missing
              </label>
              <ul className="space-y-1.5 text-xs text-[#6B7280]">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />A
                  line on who checks the receipts
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  When the stalls should reopen
                </li>
              </ul>
            </div>

            {/* Disclaimer */}
            <p className="mt-6 text-[10px] leading-tight text-[#9CA3AF]">
              Suggestions are drafts. You are responsible for what you publish.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
