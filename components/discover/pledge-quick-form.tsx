"use client";

import { useState } from "react";
import { HandHeart, ShieldAlert } from "lucide-react";
import { createPledge } from "@/actions/pledge-actions";
import { usePayment } from "@/hooks/use-payment";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";

/** Local calendar YYYY-MM-DD (avoids UTC shifts from toISOString). */
function formatLocalYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMinPledgeDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return formatLocalYYYYMMDD(date);
}

function getDefaultPledgeDate() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 7);
  return formatLocalYYYYMMDD(date);
}

const pledgePresets = [5000, 10000, 25000, 50000];

/**
 * A slim, modal-sized version of PledgeScreen's pledge form — just the
 * amount/date/name/email/note fields + submit. Deliberately drops the
 * hero, story, stats, and sticky mobile CTA bar from the full /pledge page,
 * which don't fit a dialog. The full page (app/campaign/_components/pledge-screen.tsx)
 * is untouched; this is a new, smaller sibling for opening from a card.
 */
export function PledgeQuickForm({
  causeId,
  causeTitle,
  daysActive,
  defaultName = "",
  defaultEmail = "",
}: {
  causeId: string;
  causeTitle: string;
  daysActive?: number | null;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const { initializePledgeCheckout, isLoading: paymentLoading } = usePayment();

  const [pledgeAmount, setPledgeAmount] = useState(25000);
  const [pledgeAmountInput, setPledgeAmountInput] = useState("25,000");
  const [pledgeDate, setPledgeDate] = useState(getDefaultPledgeDate);
  const [pledgeName, setPledgeName] = useState(defaultName);
  const [pledgeEmail, setPledgeEmail] = useState(defaultEmail);
  const [pledgeNote, setPledgeNote] = useState("");
  const [pledgeSubmitted, setPledgeSubmitted] = useState(false);
  const [pledgeSubmitting, setPledgeSubmitting] = useState(false);
  const [pledgeError, setPledgeError] = useState<string | null>(null);
  const [pledgeId, setPledgeId] = useState<string | null>(null);
  const [guestPledgeToken, setGuestPledgeToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    amount?: string;
    date?: string;
    email?: string;
    name?: string;
  }>({});

  const resetSubmissionState = () => {
    setPledgeSubmitted(false);
    setPledgeError(null);
  };

  const clearFieldError = (key: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const next = raw.replace(/,/g, "").replace(/\D/g, "");
    const capped = next.slice(0, 12);
    setPledgeAmountInput(capped);
    setPledgeAmount(capped ? Number(capped) : 0);
    resetSubmissionState();
    clearFieldError("amount");
  };

  const handleAmountBlur = () => {
    if (!pledgeAmountInput) return;
    setPledgeAmountInput(Number(pledgeAmountInput).toLocaleString());
  };

  const handleAmountFocus = () => {
    setPledgeAmountInput((prev) => prev.replace(/,/g, ""));
  };

  const handlePresetClick = (value: number) => {
    setPledgeAmount(value);
    setPledgeAmountInput(value.toLocaleString());
    resetSubmissionState();
    clearFieldError("amount");
  };

  const validatePledge = () => {
    const trimmedName = pledgeName.trim();
    const trimmedEmail = pledgeEmail.trim();
    const amountValue = Number(pledgeAmount || 0);
    const nextErrors: typeof fieldErrors = {};

    if (amountValue <= 0) nextErrors.amount = "Enter a valid amount.";
    if (!pledgeDate) {
      nextErrors.date = "Select a reminder date.";
    } else if (pledgeDate < getMinPledgeDate()) {
      nextErrors.date = "Choose today, tomorrow, or a later date.";
    }
    if (!trimmedEmail) nextErrors.email = "Email is required.";
    if (!trimmedName) nextErrors.name = "Name is required.";

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return "Add a valid amount, reminder date, name, and email.";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (pledgeSubmitting || paymentLoading) return;

    const validationError = validatePledge();
    if (validationError) {
      setPledgeError(validationError);
      return;
    }

    setPledgeSubmitting(true);
    setPledgeError(null);

    try {
      const { data, error } = await createPledge({
        causeId,
        amount: Number(pledgeAmount || 0),
        reminderDate: pledgeDate,
        name: pledgeName.trim(),
        email: pledgeEmail.trim(),
        note: pledgeNote.trim() || null,
        causeTitle,
      });

      if (error || !data?.id) {
        setPledgeError(error || "We could not save your pledge.");
        setPledgeSubmitted(false);
        return;
      }

      setPledgeId(data.id);
      setGuestPledgeToken(data.token ?? null);

      try {
        await initializePledgeCheckout({
          pledgeId: data.id,
          guestToken: data.token,
        });
      } catch {
        setPledgeError(
          "Your pledge was saved, but Paystack did not open. Click “Continue to Paystack” below to add your card.",
        );
        setPledgeSubmitted(false);
        return;
      }

      setPledgeSubmitted(true);
    } catch (err) {
      setPledgeError(
        err instanceof Error ? err.message : "We could not save your pledge.",
      );
      setPledgeSubmitted(false);
    } finally {
      setPledgeSubmitting(false);
    }
  };

  const handleRetryPaystack = async () => {
    if (!pledgeId || paymentLoading) return;
    setPledgeError(null);
    try {
      await initializePledgeCheckout({ pledgeId, guestToken: guestPledgeToken });
    } catch {
      setPledgeError("Could not open Paystack. Please try again.");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Pledge
        </p>
        <HandHeart className="h-4 w-4 text-[#2563EB]" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 leading-snug">
        {causeTitle}
      </h3>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1.5">
        <p className="font-semibold text-blue-900">How it works</p>
        <div className="flex justify-between">
          <span>Card verification (paid now)</span>
          <span className="font-semibold">
            ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Charged on {pledgeDate || "your date"}</span>
          <span className="font-semibold">
            ₦{pledgeAmount > 0 ? Number(pledgeAmount).toLocaleString() : "—"}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Pledge amount
          </span>
          <div className="flex flex-wrap gap-2">
            {pledgePresets.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => handlePresetClick(value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  pledgeAmount === value
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#E5E7EB] bg-white text-[#64748B]"
                }`}
              >
                ₦{value.toLocaleString()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-sm font-semibold text-slate-500">₦</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={pledgeAmountInput}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              onFocus={handleAmountFocus}
              className="w-full bg-transparent text-right text-sm text-slate-900 outline-none"
              placeholder="0"
            />
          </div>
          {fieldErrors.amount && (
            <p className="text-xs font-semibold text-rose-600">
              {fieldErrors.amount}
            </p>
          )}
        </label>

        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Reminder date
          </span>
          <input
            type="date"
            value={pledgeDate}
            min={getMinPledgeDate()}
            max={(() => {
              if (!daysActive) return undefined;
              const end = new Date();
              end.setHours(0, 0, 0, 0);
              end.setDate(end.getDate() + daysActive);
              return formatLocalYYYYMMDD(end);
            })()}
            onChange={(e) => {
              setPledgeDate(e.target.value);
              resetSubmissionState();
              clearFieldError("date");
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
          {fieldErrors.date && (
            <p className="text-xs font-semibold text-rose-600">
              {fieldErrors.date}
            </p>
          )}
        </label>

        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Email
          </span>
          <input
            type="email"
            value={pledgeEmail}
            onChange={(e) => {
              setPledgeEmail(e.target.value);
              resetSubmissionState();
              clearFieldError("email");
            }}
            placeholder="you@example.com"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
          {fieldErrors.email && (
            <p className="text-xs font-semibold text-rose-600">
              {fieldErrors.email}
            </p>
          )}
        </label>

        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Name
          </span>
          <input
            type="text"
            value={pledgeName}
            onChange={(e) => {
              setPledgeName(e.target.value);
              resetSubmissionState();
              clearFieldError("name");
            }}
            placeholder="Your name"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
          {fieldErrors.name && (
            <p className="text-xs font-semibold text-rose-600">
              {fieldErrors.name}
            </p>
          )}
        </label>

        <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
            Message (optional)
          </span>
          <textarea
            rows={2}
            value={pledgeNote}
            onChange={(e) => {
              setPledgeNote(e.target.value);
              resetSubmissionState();
            }}
            placeholder="Add a note to the organiser"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
          />
        </label>
      </div>

      {pledgeError && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {pledgeError}
        </div>
      )}

      {pledgeSubmitted && (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          aria-live="polite"
        >
          Redirecting to Paystack… If nothing opens, use the button below.
        </div>
      )}

      {pledgeId && pledgeError?.includes("Paystack") && (
        <button
          type="button"
          onClick={handleRetryPaystack}
          disabled={paymentLoading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {paymentLoading ? "Opening Paystack…" : "Continue to Paystack"}
        </button>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pledgeSubmitting || paymentLoading}
        className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pledgeSubmitting || paymentLoading
          ? "Working…"
          : `Save pledge & verify card (₦${PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()} now)`}
      </button>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span>
          Paystack checkout shows{" "}
          <strong>₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}</strong> —
          card verification only. Your pledge is charged on{" "}
          <strong>{pledgeDate || "your chosen date"}</strong>.
        </span>
      </div>
    </div>
  );
}
