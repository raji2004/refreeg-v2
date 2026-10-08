"use client";

import React, { useState } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  Check,
  Compass,
  Users,
  Building,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Small business",
  "Education",
  "Disaster relief",
  "Health",
  "Water",
  "Shelter",
  "Children",
  "Elderly",
];

const ENTITY_OPTIONS = [
  {
    id: "myself" as const,
    title: "Myself, for others",
    description: "Needs level 2 ID before it goes live",
    icon: Users,
  },
  {
    id: "organization" as const,
    title: "A registered organisation",
    description: "CAC number and level 3 verification",
    icon: Building,
  },
  {
    id: "community" as const,
    title: "A community group",
    description: "Two members must confirm",
    icon: ShieldCheck,
  },
];

export function Step1Cause() {
  const { draft, updateDraft, nextStep } = useCampaignFlow();
  const [chatInput, setChatInput] = useState("");
  const isAiMode = draft.intakeMode === "ai_chat";

  // AI Intake Chat Flow Handler
  const handleSendAnswer = (answerText?: string) => {
    const textToSend = answerText || chatInput;
    if (!textToSend.trim()) return;

    const currentQ = draft.currentAiQuestionIndex;
    const newChatHistory = [
      ...draft.aiChatHistory,
      {
        id: `user-msg-${Date.now()}`,
        sender: "user" as const,
        text: textToSend,
      },
    ];

    let nextQuestionText = "";
    let nextOptions: string[] = [];
    let fieldUpdate: any = {};

    if (currentQ === 1) {
      fieldUpdate = {
        summary: textToSend,
        currentAiQuestionIndex: 2,
      };
      nextQuestionText =
        "How much would restock one stall, and what will you buy with it?";
      nextOptions = [
        "I have a costed list",
        "Rough estimate",
        "Help me work it out",
      ];
    } else if (currentQ === 2) {
      fieldUpdate = {
        currentAiQuestionIndex: 3,
      };
      nextQuestionText =
        "Where is this taking place? Give me the city and the neighborhood.";
      nextOptions = ["Lagos, Ladipo", "Abuja, Wuse", "Port Harcourt, Mile 1"];
    } else if (currentQ === 3) {
      const parts = textToSend.split(",").map((s) => s.trim());
      fieldUpdate = {
        locationCity: parts[0] || "Lagos",
        locationArea: parts[1] || textToSend,
        fullLocation: textToSend,
        currentAiQuestionIndex: 4,
      };
      nextQuestionText = "What category best describes this?";
      nextOptions = ["Small business", "Disaster relief", "Community"];
    } else if (currentQ === 4) {
      fieldUpdate = {
        category: textToSend,
        currentAiQuestionIndex: 5,
      };
      nextQuestionText = "Great! Who is raising these funds?";
      nextOptions = [
        "Myself, for others",
        "A registered organisation",
        "A community group",
      ];
    } else {
      // 5 of 5 completed -> automatically generate title & transition to manual review or next step
      fieldUpdate = {
        title: draft.title || "Restock 42 stalls after the Ladipo fire",
        intakeMode: "manual",
      };
    }

    if (nextQuestionText) {
      newChatHistory.push({
        id: `ai-msg-${Date.now()}`,
        sender: "ai",
        text: nextQuestionText,
        options: nextOptions,
      });
    }

    updateDraft({
      aiChatHistory: newChatHistory,
      ...fieldUpdate,
    });
    setChatInput("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      {isAiMode ? (
        /* ================= FRAME 80: AI INTAKE ================= */
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0E1B14] px-3 py-1 text-xs font-semibold text-[#CFF454]">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Campaign Assistant
                </span>
                <span className="text-xs font-medium text-[#6B7280]">
                  Question {draft.currentAiQuestionIndex} of 5
                </span>
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
                Tell me what you are raising for
              </h2>
              <p className="text-sm text-[#6B7280] sm:text-base">
                Five questions, then I fill the form and you edit anything you
                like.
              </p>
            </div>

            {/* Conversation Log */}
            <div className="my-8 space-y-4">
              {draft.aiChatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-2",
                    msg.sender === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-base",
                      msg.sender === "user"
                        ? "bg-[#0E1B14] text-white"
                        : "border border-[#EFEBE1] bg-[#FAF9F6] text-[#0E1B14]",
                    )}
                  >
                    <p>{msg.text}</p>
                  </div>

                  {/* Suggestion Chips */}
                  {msg.sender === "ai" &&
                    msg.options &&
                    msg.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSendAnswer(opt)}
                            className="rounded-full border border-[#EFEBE1] bg-white px-3 py-1.5 text-xs font-medium text-[#0E1B14] shadow-sm transition hover:border-[#0E1B14] hover:bg-[#F2F2EE]"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAnswer();
              }}
              className="mt-6 flex items-center gap-2 rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-2 focus-within:border-[#0E1B14] focus-within:ring-2 focus-within:ring-[#0E1B14]/10"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your answer in plain words..."
                className="w-full bg-transparent px-3 py-2 text-sm text-[#0E1B14] placeholder-gray-400 outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E1B14] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-30"
              >
                <span>Send</span>
                <CornerDownLeft className="h-3 w-3" />
              </button>
            </form>

            {/* Escape Hatch */}
            <div className="mt-6 flex items-center justify-between border-t border-[#EFEBE1] pt-4">
              <button
                type="button"
                onClick={() => updateDraft({ intakeMode: "manual" })}
                className="text-xs font-medium text-[#6B7280] underline transition hover:text-[#0E1B14]"
              >
                Skip and fill the form myself
              </button>
              {draft.currentAiQuestionIndex > 2 && (
                <button
                  type="button"
                  onClick={() => updateDraft({ intakeMode: "manual" })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B5D3B] hover:underline"
                >
                  <span>Review form with current answers</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ================= FRAME 81: MANUAL CAUSE FORM ================= */
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
                  What kind of campaign is this?
                </h2>
                <p className="mt-1 text-sm text-[#6B7280]">
                  This decides who sees it first in Discover.
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateDraft({ intakeMode: "ai_chat" })}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EFEBE1] bg-[#FAF9F6] px-3 py-1.5 text-xs font-semibold text-[#0E1B14] hover:border-[#0E1B14]"
              >
                <Sparkles className="h-3 w-3 text-[#0B5D3B]" />
                Use AI Assistant
              </button>
            </div>

            {/* Form Body */}
            <div className="mt-8 space-y-8">
              {/* Category Pills */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Cause Category
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = draft.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => updateDraft({ category: cat })}
                        className={cn(
                          "rounded-full px-4 py-2 text-xs font-semibold transition-all sm:text-sm",
                          isSelected
                            ? "bg-[#0E1B14] text-white shadow-sm"
                            : "border border-[#EFEBE1] bg-[#FAF9F6] text-[#0E1B14] hover:bg-[#F2F2EE]",
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Entity: Who is raising */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Who is raising
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {ENTITY_OPTIONS.map((entity) => {
                    const isSelected = draft.entityType === entity.id;
                    const Icon = entity.icon;
                    return (
                      <div
                        key={entity.id}
                        onClick={() => updateDraft({ entityType: entity.id })}
                        className={cn(
                          "cursor-pointer rounded-2xl border p-4 transition-all",
                          isSelected
                            ? "border-[#0E1B14] bg-[#F8F7F3] shadow-sm ring-1 ring-[#0E1B14]"
                            : "border-[#EFEBE1] bg-white hover:border-gray-300",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isSelected ? "text-[#0E1B14]" : "text-[#6B7280]",
                            )}
                          />
                          {isSelected && (
                            <Check className="h-4 w-4 text-[#0E1B14] stroke-[3]" />
                          )}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[#0E1B14]">
                          {entity.title}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">
                          {entity.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Where is this located?
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#6B7280]">
                      City / State
                    </label>
                    <input
                      type="text"
                      value={draft.locationCity}
                      onChange={(e) =>
                        updateDraft({
                          locationCity: e.target.value,
                          fullLocation:
                            `${e.target.value}, ${draft.locationArea}`.trim(),
                        })
                      }
                      placeholder="e.g. Lagos"
                      className="w-full rounded-xl border border-[#EFEBE1] bg-[#FAF9F6] px-4 py-2.5 text-sm text-[#0E1B14] outline-none focus:border-[#0E1B14]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#6B7280]">
                      Area / Neighborhood
                    </label>
                    <input
                      type="text"
                      value={draft.locationArea}
                      onChange={(e) =>
                        updateDraft({
                          locationArea: e.target.value,
                          fullLocation:
                            `${draft.locationCity}, ${e.target.value}`.trim(),
                        })
                      }
                      placeholder="e.g. Ladipo"
                      className="w-full rounded-xl border border-[#EFEBE1] bg-[#FAF9F6] px-4 py-2.5 text-sm text-[#0E1B14] outline-none focus:border-[#0E1B14]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-[#EFEBE1] pt-6 sm:flex-row">
              <button
                type="button"
                onClick={() => updateDraft({ intakeMode: "ai_chat" })}
                className="text-xs font-medium text-[#6B7280] underline hover:text-[#0E1B14]"
              >
                Back to AI intake
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black sm:w-auto"
              >
                <span>Continue to the story</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
