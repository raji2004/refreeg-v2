"use client";

import { X } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePledgeForm } from "@/hooks/use-pledge-form";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";
import {
  getMaxPledgeDate,
  getMinPledgeDate,
  pledgePresets,
} from "@/lib/schemas/pledge.schema";

/**
 * A slim, modal-sized version of PledgeScreen's pledge form: just the
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
  const {
    form,
    setFormFields,
    amountInput,
    errors,
    submission,
    paymentLoading,
    busy,
    handleAmountChange,
    handleAmountBlur,
    handleAmountFocus,
    handlePresetClick,
    handleSubmit,
    handleRetryPaystack,
  } = usePledgeForm({ causeId, causeTitle, defaultName, defaultEmail });

  const maxPledgeDate = getMaxPledgeDate(daysActive);
  const chargeDay = form.date
    ? new Date(`${form.date}T00:00:00`).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
      })
    : "your chosen date";
  // Signed-in donors already have both; only ask when something is missing.
  const askContact = !defaultName.trim() || !defaultEmail.trim();

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
              form.amount === value
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
          value={amountInput}
          onChange={handleAmountChange}
          onBlur={handleAmountBlur}
          onFocus={handleAmountFocus}
          aria-label="Pledge amount in naira"
          className="w-full bg-transparent text-[15px] text-ink outline-none"
          placeholder="Other amount"
        />
      </label>
      {fieldError(errors.amount)}

      <p className={cn(label, "mt-5")}>Charge on</p>
      <input
        type="date"
        value={form.date}
        min={getMinPledgeDate()}
        max={maxPledgeDate}
        onChange={(e) => setFormFields("date", e.target.value)}
        aria-label="Date to charge your pledge"
        className={cn(field, "mt-3")}
      />
      {fieldError(errors.date)}

      {askContact && (
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setFormFields("name", e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              className={field}
            />
            {fieldError(errors.name)}
          </div>
          <div>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setFormFields("email", e.target.value)}
              placeholder="Email for reminders"
              aria-label="Email for reminders"
              className={field}
            />
            {fieldError(errors.email)}
          </div>
        </div>
      )}

      <textarea
        rows={2}
        value={form.note}
        onChange={(e) => setFormFields("note", e.target.value)}
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
            {form.amount > 0 ? `₦${form.amount.toLocaleString()}` : "₦0"}
          </span>
        </div>
      </div>

      {submission.error && (
        <p
          className="mt-4 rounded-xl bg-rust/10 px-4 py-3 text-sm text-rust"
          role="alert"
        >
          {submission.error}
        </p>
      )}

      {submission.submitted && (
        <p
          className="mt-4 rounded-xl bg-forest/10 px-4 py-3 text-sm text-forest"
          aria-live="polite"
        >
          Opening Paystack… If nothing opens, use the button below.
        </p>
      )}

      {submission.pledgeId && submission.error?.includes("Paystack") && (
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
          : `Pledge ${form.amount > 0 ? `₦${form.amount.toLocaleString()}` : ""}`.trim()}
      </Button>
      <p className="mt-3 text-center text-[13px] leading-5 text-ink/55">
        Paystack will show ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}{" "}
        today to check your card. Your pledge is charged on {chargeDay}.
      </p>
    </div>
  );
}
