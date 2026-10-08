"use client";

import React, { useState } from "react";
import { useCampaignFlow } from "../campaign-flow-provider";
import {
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Sparkles,
  Calendar,
} from "lucide-react";
import { format, addDays } from "date-fns";

export function Step3Target() {
  const {
    draft,
    updateDraft,
    totalGoal,
    addLineItem,
    updateLineItem,
    removeLineItem,
    nextStep,
    prevStep,
  } = useCampaignFlow();

  const [newLineLabel, setNewLineLabel] = useState("");
  const [newLineQty, setNewLineQty] = useState(1);
  const [newLineUnitCost, setNewLineUnitCost] = useState(50000);

  const handleAddNewLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLineLabel.trim()) return;
    addLineItem({
      label: newLineLabel.trim(),
      quantity: Number(newLineQty) || 1,
      unitPrice: Number(newLineUnitCost) || 0,
    });
    setNewLineLabel("");
    setNewLineQty(1);
    setNewLineUnitCost(50000);
  };

  const endDateFormatted = draft.endDate
    ? format(new Date(draft.endDate), "dd MMMM yyyy")
    : format(addDays(new Date(), 60), "dd MMMM yyyy");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-[#EFEBE1] bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#0E1B14] sm:text-3xl">
            Target and deadline
          </h2>
          <p className="text-sm text-[#6B7280]">
            Break the number down so donors can see what their gift buys.
          </p>
        </div>

        {/* Big Target Amount Display */}
        <div className="mt-8 rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-6 text-center sm:p-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            Total Funding Target
          </span>
          <div className="mt-2 font-serif text-3xl font-extrabold tracking-tight text-[#0E1B14] sm:text-5xl">
            ₦{totalGoal.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-[#6B7280]">
            Calculated automatically from your itemized cost breakdown below
          </p>
        </div>

        {/* Itemized Line Items */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              What it is made of
            </label>
            <span className="text-xs text-[#6B7280]">
              {draft.lineItems.length} cost items
            </span>
          </div>

          <div className="space-y-3">
            {draft.lineItems.map((item) => {
              const lineTotal = item.quantity * item.unitPrice;
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-4 transition hover:border-[#0E1B14] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#0E1B14]">
                      {item.label}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {item.quantity} × ₦{item.unitPrice.toLocaleString()} each
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="font-mono text-sm font-bold text-[#0E1B14] sm:text-base">
                      ₦{lineTotal.toLocaleString()}
                    </span>
                    {draft.lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Line Form */}
          <form
            onSubmit={handleAddNewLine}
            className="mt-4 grid gap-3 rounded-2xl border border-dashed border-[#EFEBE1] bg-[#FAF9F6]/60 p-4 sm:grid-cols-[1fr_80px_120px_auto]"
          >
            <input
              type="text"
              value={newLineLabel}
              onChange={(e) => setNewLineLabel(e.target.value)}
              placeholder="Add a line, e.g. Transport or Materials"
              className="rounded-xl border border-[#EFEBE1] bg-white px-3 py-2 text-xs text-[#0E1B14] outline-none focus:border-[#0E1B14]"
            />
            <input
              type="number"
              min={1}
              value={newLineQty}
              onChange={(e) => setNewLineQty(Number(e.target.value))}
              placeholder="Qty"
              className="rounded-xl border border-[#EFEBE1] bg-white px-3 py-2 text-xs text-[#0E1B14] outline-none focus:border-[#0E1B14]"
            />
            <input
              type="number"
              min={0}
              step={1000}
              value={newLineUnitCost}
              onChange={(e) => setNewLineUnitCost(Number(e.target.value))}
              placeholder="Cost each"
              className="rounded-xl border border-[#EFEBE1] bg-white px-3 py-2 text-xs text-[#0E1B14] outline-none focus:border-[#0E1B14]"
            />
            <button
              type="submit"
              disabled={!newLineLabel.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#0E1B14] px-4 py-2 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Deadline / Runs until */}
        <div className="mt-8 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            Runs until
          </label>
          <div className="flex items-center justify-between rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold text-[#0E1B14]">
                  {endDateFormatted}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Campaign active for 60 days
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Benchmark Note (Frame 84) */}
        <div className="mt-8 rounded-2xl border border-[#EFEBE1] bg-[#F8F7F3] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#0E1B14] p-1.5 text-[#CFF454]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0E1B14]">
                A note on the number
              </span>
              <p className="text-xs leading-relaxed text-[#374151]">
                Campaigns like yours in Lagos raise ₦4.2M on average in 52 days.
                Splitting into two rounds of 21 stalls funds faster and lets you
                show results early.
              </p>
            </div>
          </div>
        </div>

        {/* Donor Impact Pill */}
        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
            A gift of ₦5,000 buys
          </label>
          <input
            type="text"
            value={draft.donorPerkDescription}
            onChange={(e) =>
              updateDraft({ donorPerkDescription: e.target.value })
            }
            placeholder="e.g. A bag of rice and a crate of tomatoes for one stall"
            className="w-full rounded-2xl border border-[#EFEBE1] bg-[#FAF9F6] px-4 py-3 text-sm text-[#0E1B14] outline-none focus:border-[#0E1B14]"
          />
          <p className="text-[11px] text-[#6B7280]">
            Shown directly on your public campaign card to inspire individual
            gifts.
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="mt-10 flex items-center justify-between border-t border-[#EFEBE1] pt-6">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#0E1B14]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to story
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-2 rounded-full bg-[#0E1B14] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
          >
            <span>Continue to photos</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
