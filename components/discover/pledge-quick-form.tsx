"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPledge } from "@/actions/pledge-actions";
import { usePayment } from "@/hooks/use-payment";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";

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
      await initializePledgeCheckout({
        pledgeId,
        guestToken: guestPledgeToken,
      });
    } catch {
      setPledgeError("Could not open Paystack. Please try again.");
    }
  };

  const maxPledgeDate = (() => {
    if (!daysActive) return undefined;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + daysActive);
    return formatLocalYYYYMMDD(end);
  })();
  const chargeDay = pledgeDate
    ? new Date(`${pledgeDate}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      })
    : "your chosen date";
  // Signed-in donors already have both; only ask when something is missing.
  const askContact = !defaultName.trim() || !defaultEmail.trim();
  const busy = pledgeSubmitting || paymentLoading;

  const label =
    "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";
  const field =
    "h-11 w-full rounded-xl border border-hairline bg-bone px-4 text-sm text-ink outline-none focus:border-ink/40";
  const fieldError = (message?: string) =>
    message ? (
      <p className="mt-1.5 text-xs font-medium text-rust">{message}</p>
    ) : null;

  return (
    <div className="rounded-3xl bg-surface p-6 sm:p-7">
      <div className="flex items-start gap-4 border-b border-hairline pb-5">
        <div className="min-w-0 flex-1">
          <p className={label}>Pledge</p>
          <p className="mt-1.5 font-semibold leading-snug text-ink">
            {causeTitle}
          </p>
        </div>
        <DialogClose
          className="rounded-full p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </DialogClose>
      </div>

      <p className={cn(label, "mt-5")}>Amount</p>
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {pledgePresets.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handlePresetClick(value)}
            className={cn(
              "h-12 rounded-xl border text-[15px] font-semibold transition-colors",
              pledgeAmount === value
                ? "border-ink bg-ink text-ink-foreground"
                : "border-hairline bg-surface text-ink hover:border-ink/30",
            )}
          >
            ₦{value / 1000}k
          </button>
        ))}
      </div>
      <label className="mt-2.5 flex h-12 items-center gap-2 rounded-xl border border-hairline bg-bone px-4 focus-within:border-ink/40">
        <span className="text-sm font-semibold text-ink/50">₦</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={12}
          value={pledgeAmountInput}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          onFocus={handleAmountFocus}
          aria-label="Pledge amount in naira"
          className="w-full bg-transparent text-[15px] text-ink outline-none"
          placeholder="Other amount"
        />
      </label>
      {fieldError(fieldErrors.amount)}

      <p className={cn(label, "mt-5")}>Charge on</p>
      <input
        type="date"
        value={pledgeDate}
        min={getMinPledgeDate()}
        max={maxPledgeDate}
        onChange={(e) => {
          setPledgeDate(e.target.value);
          resetSubmissionState();
          clearFieldError("date");
        }}
        aria-label="Date to charge your pledge"
        className={cn(field, "mt-3")}
      />
      {fieldError(fieldErrors.date)}

      {askContact && (
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <input
              type="text"
              value={pledgeName}
              onChange={(e) => {
                setPledgeName(e.target.value);
                resetSubmissionState();
                clearFieldError("name");
              }}
              placeholder="Your name"
              aria-label="Your name"
              className={field}
            />
            {fieldError(fieldErrors.name)}
          </div>
          <div>
            <input
              type="email"
              value={pledgeEmail}
              onChange={(e) => {
                setPledgeEmail(e.target.value);
                resetSubmissionState();
                clearFieldError("email");
              }}
              placeholder="Email for reminders"
              aria-label="Email for reminders"
              className={field}
            />
            {fieldError(fieldErrors.email)}
          </div>
        </div>
      )}

      <textarea
        rows={2}
        value={pledgeNote}
        onChange={(e) => {
          setPledgeNote(e.target.value);
          resetSubmissionState();
        }}
        placeholder="Add a note to the organiser (optional)"
        aria-label="Note to the organiser"
        className="mt-5 w-full resize-none rounded-xl border border-hairline bg-bone px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
      />

      <div className="mt-5 space-y-2 rounded-2xl bg-bone px-4 py-3.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-ink/70">Card check today</span>
          <span className="font-semibold text-ink">
            ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink/70">Charged on {chargeDay}</span>
          <span className="font-semibold text-ink">
            {pledgeAmount > 0
              ? `₦${Number(pledgeAmount).toLocaleString()}`
              : "—"}
          </span>
        </div>
      </div>

      {pledgeError && (
        <p
          className="mt-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust"
          role="alert"
        >
          {pledgeError}
        </p>
      )}

      {pledgeSubmitted && (
        <p
          className="mt-4 rounded-xl bg-forest/10 px-4 py-3 text-sm text-forest"
          aria-live="polite"
        >
          Opening Paystack… If nothing opens, use the button below.
        </p>
      )}

      {pledgeId && pledgeError?.includes("Paystack") && (
        <Button
          variant="outline"
          onClick={handleRetryPaystack}
          disabled={paymentLoading}
          className="mt-3 h-12 w-full rounded-2xl border-hairline bg-surface font-semibold text-ink hover:bg-bone"
        >
          {paymentLoading ? "Opening Paystack…" : "Continue to Paystack"}
        </Button>
      )}

      <Button
        variant="ink"
        onClick={handleSubmit}
        disabled={busy}
        className="mt-5 h-14 w-full rounded-2xl text-base font-semibold shadow-[0_10px_24px_-10px_hsl(var(--ink)/0.6)]"
      >
        {busy
          ? "Working…"
          : `Pledge ${pledgeAmount > 0 ? `₦${Number(pledgeAmount).toLocaleString()}` : ""}`.trim()}
      </Button>
      <p className="mt-3 text-center text-[13px] leading-5 text-ink/55">
        Paystack will show ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}{" "}
        today to check your card. Your pledge is charged on {chargeDay}.
      </p>
    </div>
  );
}
