"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { HandHeart, ShieldAlert } from "lucide-react";
import type { Cause } from "@/types";
import { usePledgeForm } from "@/hooks/use-pledge-form";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/payments/pledge-constants";
import {
  getMaxPledgeDate,
  getMinPledgeDate,
  pledgePresets,
} from "@/lib/schemas/pledge.schema";
import { getMediaUrl } from "@/lib/s3/media";
import Image from "next/image";

type ProfileSummary = {
  email: string;
  name: string;
  id: string;
  subaccount: string;
};

type CauseDetail = Cause & {
  user: {
    name: string;
    email: string;
    sub_account_code?: string | null;
  };
  summary?: string | null;
  location?: string | null;
};

type PledgeScreenProps = {
  cause: CauseDetail;
  profile: ProfileSummary;
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-gray-200 bg-white px-3 py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
      <span className="text-slate-500">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          {label}
        </p>
        <p className="font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default function PledgeScreen({ cause, profile }: PledgeScreenProps) {
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
  } = usePledgeForm({
    causeId: cause.id,
    causeTitle: cause.title,
    defaultName: profile.name || "",
    defaultEmail: profile.email || "",
  });

  return (
    <div
      className="min-h-screen bg-[#F6F8FB] pb-24 pt-10 text-slate-900 sm:pt-14"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 20%, rgba(37,99,235,0.08), transparent 60%)",
      }}
    >
      <div className="border-b border-gray-200 bg-white">
        <div className="container px-4 py-4 sm:py-6">
          <motion.div
            className="flex flex-col gap-5 sm:gap-6"
            initial="hidden"
            animate="show"
            variants={fadeUp}
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-slate-900">
                <HandHeart className="h-4 w-4 text-blue-600" />
                Pledge
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-3xl lg:text-5xl">
                Pledge now, donate later.
              </h1>
              <p className="text-sm leading-relaxed text-slate-500 sm:text-base lg:text-lg">
                {cause.summary ||
                  "Make a pledge, save your card on Paystack, and your donation is charged on the date you pick."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <StatItem
                icon={<HandHeart className="h-4 w-4 text-blue-600" />}
                label="Campaign"
                value="Verified"
              />
              <StatItem
                icon={<ShieldAlert className="h-4 w-4 text-[#F59E0B]" />}
                label="Reminder"
                value="Email"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <main className="container grid gap-6 px-4 pt-6 sm:pt-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="order-2 space-y-6 lg:order-1">
          <motion.div
            className="rounded-[14px] border border-gray-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Story
            </p>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Created by</span>
                <span className="font-medium text-slate-800">
                  {cause.user.name}
                </span>
                <span className="text-slate-300">•</span>
                <span className="capitalize">{cause.category}</span>
              </div>
              {cause.description ? (
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {cause.description}
                </p>
              ) : cause.summary ? (
                <p className="text-sm text-slate-600">{cause.summary}</p>
              ) : (
                <p className="text-sm text-slate-500">
                  No story yet. The campaign creator can add the full context
                  and plan here.
                </p>
              )}
            </div>
          </motion.div>
          <motion.div
            className="rounded-[14px] border border-gray-200 bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
                Pledge
              </p>
              <HandHeart className="h-4 w-4 text-blue-600" />
            </div>

            <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
              Pledge to donate later
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Set a date, enter your card on Paystack, and we charge your full
              pledge on that day, automatically sent to the cause.
            </p>

            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1.5">
              <p className="font-semibold text-blue-900">How it works</p>
              <div className="flex justify-between">
                <span>Card verification charge (paid now)</span>
                <span className="font-semibold">
                  ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pledge amount charged on {form.date || "your date"}</span>
                <span className="font-semibold">
                  ₦{form.amount > 0 ? form.amount.toLocaleString() : "0"}
                </span>
              </div>
              <p className="text-xs text-blue-600 pt-0.5">
                Paystack will show ₦
                {PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()} on checkout:
                that is the card verification only. Your pledge of ₦
                {form.amount > 0 ? form.amount.toLocaleString() : "0"} is
                charged on {form.date || "the date you pick"}.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
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
                      className={`rounded-full border px-3 py-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                        form.amount === value
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-200 bg-white text-slate-500"
                      }`}
                    >
                      ₦{value.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span className="text-sm font-semibold text-slate-500">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={amountInput}
                    onChange={handleAmountChange}
                    onBlur={handleAmountBlur}
                    onFocus={handleAmountFocus}
                    className="w-full bg-transparent text-right text-sm text-slate-900 outline-none"
                    placeholder="0"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs font-semibold text-rose-600">
                    {errors.amount}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Choose the amount you plan to donate later.
                </p>
              </label>

              <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Reminder date
                </span>
                <input
                  type="date"
                  value={form.date}
                  min={getMinPledgeDate()}
                  max={getMaxPledgeDate(cause.days_active)}
                  onChange={(event) =>
                    setFormFields("date", event.target.value)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                />
                {errors.date && (
                  <p className="text-xs font-semibold text-rose-600">
                    {errors.date}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Today, tomorrow, or any later day (not in the past).
                  {cause.days_active
                    ? ` Latest: last day of the campaign window.`
                    : ""}{" "}
                  We will use this date for the charge / reminder. SMS can be
                  added later.
                </p>
              </label>

              <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setFormFields("email", event.target.value)
                  }
                  placeholder="you@example.com"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                />
                {errors.email && (
                  <p className="text-xs font-semibold text-rose-600">
                    {errors.email}
                  </p>
                )}
              </label>

              <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Name
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setFormFields("name", event.target.value)
                  }
                  placeholder="Your name"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-rose-600">
                    {errors.name}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  We will only email about this pledge.
                </p>
              </label>

              <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Message (optional)
                </span>
                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(event) =>
                    setFormFields("note", event.target.value)
                  }
                  placeholder="Add a note to the organiser"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                />
              </label>
            </div>

            {submission.error && (
              <div
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {submission.error}
              </div>
            )}

            {submission.submitted && (
              <div
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                aria-live="polite"
              >
                Redirecting to Paystack… If nothing opens, use the button below.
              </div>
            )}

            {submission.pledgeId && submission.error?.includes("Paystack") && (
              <button
                type="button"
                onClick={handleRetryPaystack}
                disabled={paymentLoading}
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {paymentLoading ? "Opening Paystack…" : "Continue to Paystack"}
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy
                ? "Working…"
                : `Save pledge & verify card (₦${PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()} now)`}
            </button>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Paystack checkout will show{" "}
                <strong>
                  ₦{PLEDGE_VERIFICATION_AMOUNT_NGN.toLocaleString()}
                </strong>
                . This is only a card-save verification. Your actual pledge of{" "}
                <strong>
                  ₦{form.amount > 0 ? form.amount.toLocaleString() : "0"}
                </strong>{" "}
                will be charged on{" "}
                <strong>{form.date || "your chosen date"}</strong>.
              </span>
            </div>
          </motion.div>
        </section>

        <aside className="order-1 space-y-6 lg:order-2">
          <motion.div
            className="rounded-[14px] border border-gray-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Campaign
            </p>
            <div className="mt-3 flex items-start gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                {cause.image ? (
                  <Image
                    src={getMediaUrl(cause.image) || "/icons/placeholder.svg"}
                    alt={cause.title}
                    fill
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {cause.title}
                </p>
                {cause.location ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {cause.location}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Raised</span>
                <span className="font-semibold text-slate-900">
                  ₦{Number(cause.raised || 0).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Goal</span>
                <span className="font-semibold text-slate-900">
                  ₦{Number(cause.goal || 0).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Progress</span>
                <span className="font-semibold text-emerald-700">
                  {cause.goal
                    ? Math.round((cause.raised / cause.goal) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: `${cause.goal ? Math.min((cause.raised / cause.goal) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">Organizer</p>
              <p className="mt-1">{cause.user.name}</p>
            </div>
          </motion.div>

          <motion.div
            className="rounded-[14px] border border-gray-200 bg-white p-4 text-sm text-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              What happens next
            </p>
            <p className="mt-3">
              After your card is saved, you will get a confirmation email. On
              your reminder date we charge the full pledge automatically; you
              will receive a receipt when it succeeds.
            </p>
          </motion.div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? "Working…" : "Save & Paystack"}
          </button>
        </div>
      </div>
    </div>
  );
}
