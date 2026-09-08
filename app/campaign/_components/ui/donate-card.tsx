import { motion } from "framer-motion";
import { HandHeart, ShieldAlert, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { BreetCryptoDonationModal } from "@/components/crypto-details/BreetCryptoDonationModal";
import { causePublicPath } from "@/lib/causes/slug";
import type { CauseDetail, ProfileSummary } from "../types/types";
import { DONATION_PRESETS, fadeUp } from "../types/types";

const DonationForm = dynamic(
  () => import("@/components/donation-form").then((mod) => mod.DonationForm),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
  },
);

export function DonateCard({
  cause,
  donation,
  setDonation,
  recurring,
  setRecurring,
  tip,
  setTip,
  serviceFee,
  providerFee,
  totalWithTip,
  profile,
}: {
  cause: CauseDetail;
  donation: number;
  setDonation: (value: number) => void;
  recurring: "one_time" | "weekly" | "monthly";
  setRecurring: (value: "one_time" | "weekly" | "monthly") => void;
  tip: number;
  setTip: (value: number) => void;
  serviceFee: number;
  providerFee: number;
  totalWithTip: number;
  profile: ProfileSummary;
}) {
  return (
    <motion.div
      className="overflow-hidden rounded-[20px] border border-[#DDE3EA] bg-white"
      variants={fadeUp}
    >
      <div className="bg-[#10233F] px-4 py-4 text-white sm:px-6 sm:py-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D9FF5B]">
            Support this campaign
          </p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 sm:h-9 sm:w-9">
            <HandHeart className="h-4 w-4 text-[#D9FF5B]" />
          </span>
        </div>
        <h3 className="mt-1.5 text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl">
          Make a donation
        </h3>
        <p className="mt-1.5 hidden text-xs leading-5 text-white/55 sm:block">
          Secure checkout · Publicly audited milestones
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-6 [&_label]:text-sm [&_label]:text-[#33445A] [&_input]:h-10 sm:[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-[#D8E0E8] [&_textarea]:rounded-xl [&_textarea]:border-[#D8E0E8]">
        <DonationForm
          causeId={cause.id}
          profile={profile}
          status={cause.status}
          subaccount={cause?.user.sub_account_code ?? undefined}
          flutterwaveSubAccountId={
            cause?.user.flutterwave_sub_account_id ?? undefined
          }
          causeName={cause.title}
          causeUrl={causePublicPath(cause)}
          recurring={recurring}
          tip={tip}
          onTipChange={setTip}
          initialAmount={donation}
          hideHeader
          hideAmountField
          hideCheckoutSummary
          flush
          compactOptionalFields
          submitLabel="Donate"
          submitClassName="h-11 rounded-xl bg-[#235DA7] text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(35,93,167,0.8)] hover:bg-[#1D4E8E] disabled:bg-[#AAB7C5] sm:h-12"
          beforeFields={
            <>
              <div className="grid grid-cols-2 gap-2">
                {DONATION_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDonation(amount)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7] sm:py-2.5 ${
                      donation === amount
                        ? "border-[#2563EB] bg-[#ECF5FF] text-[#2563EB]"
                        : "border-[#D8E0E8] bg-white text-[#53647A] hover:border-[#8FA5BC]"
                    }`}
                  >
                    ₦{amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#65758B]">
                  Donation amount
                </span>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-[#CBD7E4] bg-white">
                  <span className="flex items-center justify-center bg-[#10233F] px-4 text-sm font-bold text-white">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    value={donation ? donation.toLocaleString("en-US") : ""}
                    onChange={(event) => {
                      const next = event.target.value.replace(/\D/g, "");
                      const capped = next.slice(0, 12);
                      setDonation(capped ? Number(capped) : 0);
                    }}
                    className="min-w-0 flex-1 appearance-none bg-transparent px-3 py-2 text-right text-lg font-bold tabular-nums text-[#10233F] outline-none"
                    placeholder="Enter amount"
                    aria-label="Donation amount"
                  />
                </div>
                <p className="hidden text-xs text-slate-500 sm:block">
                  This is the amount that goes toward the campaign.
                </p>
              </label>
            </>
          }
          afterFields={
            <div className="rounded-2xl bg-[#ECF5FF] p-3 sm:p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-[#10233F]">
                <span>Campaign receives</span>
                <span>₦{donation.toLocaleString()}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#C8D8E8] pt-3">
                <span className="text-sm font-bold text-[#10233F]">
                  Checkout total
                </span>
                <span className="text-lg font-bold text-[#235DA7]">
                  ₦{totalWithTip.toLocaleString()}
                </span>
              </div>
              {(serviceFee > 0 || tip > 0) && (
                <details className="group mt-3 border-t border-[#C8D8E8] pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#53647A]">
                    View breakdown
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 grid gap-1.5 text-xs text-[#65758B]">
                    <div className="flex justify-between">
                      <span>Service fee</span>
                      <span>₦{serviceFee.toLocaleString()}</span>
                    </div>
                    {providerFee > 0 && (
                      <div className="flex justify-between">
                        <span>Payment processing</span>
                        <span>₦{providerFee.toLocaleString()}</span>
                      </div>
                    )}
                    {tip > 0 && (
                      <div className="flex justify-between">
                        <span>Platform tip</span>
                        <span>₦{tip.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          }
        />

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-[#E1E7ED]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B899A]">
            Or use crypto
          </span>
          <span className="h-px flex-1 bg-[#E1E7ED]" />
        </div>
        <BreetCryptoDonationModal
          causeId={cause.id}
          donorId={profile.id || null}
          triggerLabel="Donate with USDT"
          triggerClassName="h-11 w-full gap-x-2 rounded-xl border-[#CBD7E4] bg-white text-sm font-bold text-[#33445A] shadow-none hover:border-[#235DA7] hover:bg-[#ECF5FF] hover:text-[#235DA7] sm:h-12"
        />
      </div>

      <div className="mx-4 mb-4 flex items-start gap-2 border-t border-[#E8EDF2] pt-3 text-[11px] leading-4 text-[#65758B] sm:mx-6 sm:mb-5 sm:pt-4 sm:text-xs sm:leading-5">
        <ShieldAlert className="mt-0.5 h-4 w-4 text-[#F59E0B]" />
        Donations below ₦5 do not earn EIZA. Refunds or chargebacks remove
        rewards.
      </div>

      {!profile.id && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs text-[#64748B]">
          <span>Guest checkout</span>
          <span className="text-[#22C55E]">Enabled</span>
        </div>
      )}
    </motion.div>
  );
}
