import { ArrowRight, Users } from "lucide-react";

import type { ReferralRow } from "@/actions/users/referral-actions";
import { Heading } from "@/components/marketing/Typography";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

import { CopyLinkButton } from "./CopyLinkButton";
import { ReferralItem } from "./ReferralItem";

const STEPS = [
  {
    title: "Share your link.",
    text: "Send it to friends on WhatsApp, by email, or anywhere people listen to you.",
  },
  {
    title: "They join or give.",
    text: "They sign up or donate to a verified cause through your link.",
  },
  {
    title: "You earn and climb.",
    text: "Collect points for every friend who completes KYC and rise on the public leaderboard.",
  },
];

const inviteButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-blue-accent px-6 py-3 text-sm font-medium text-white shadow-xl transition-colors hover:bg-blue-accent/90";

export function ReferralHub({
  referralLink,
  stats,
  referrals,
  onInvite,
}: {
  referralLink: string;
  stats: { label: string; value: string }[];
  referrals: ReferralRow[];
  onInvite: () => void;
}) {
  return (
    <div className="space-y-16 md:space-y-20">
      <section className="rounded-2xl bg-warm-neutral px-6 py-10 sm:px-10 md:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          <Heading>
            Your link,
            <br />
            <em>your impact.</em>
          </Heading>
          <div>
            <p className="text-sm leading-relaxed text-ink/70 sm:text-base">
              Anyone who signs up or gives through your link counts toward your
              rewards.
            </p>
            <label htmlFor="referral-link" className="sr-only">
              Referral link
            </label>
            <input
              id="referral-link"
              readOnly
              value={referralLink}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-5 w-full truncate rounded-full bg-surface px-5 py-3 font-mono text-xs text-ink/70 outline-none focus-visible:ring-2 focus-visible:ring-blue-accent"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onInvite}
                className={inviteButtonClass}
              >
                Invite friends
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <CopyLinkButton referralLink={referralLink} label="Copy link" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <Eyebrow className="mb-6 block">Your numbers</Eyebrow>
        <dl className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "px-1 lg:px-6",
                index % 2 === 1 && "border-l border-hairline pl-6",
                index > 0 && "lg:border-l lg:border-hairline",
                index === 0 && "lg:pl-0",
              )}
            >
              <dd className="font-fraunces text-4xl font-normal text-ink md:text-5xl">
                {stat.value}
              </dd>
              <dt className="mt-2 text-sm text-ink/60">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <div>
          <Eyebrow className="mb-3 block">How it works</Eyebrow>
          <Heading>
            Three steps to <em>rewards.</em>
          </Heading>
        </div>
        <ol>
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-4 border-b border-hairline py-6 first:pt-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/20 text-sm text-ink">
                {index + 1}
              </span>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-ink md:text-lg">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink/70 md:text-base">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <Eyebrow className="mb-3 block">Your referrals</Eyebrow>
        <Heading size="subsection">
          The people <em>you brought.</em>
        </Heading>

        {referrals.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Users className="h-6 w-6 text-ink/40" />}
            title="No referrals yet"
            description="Share your link to start earning. Every signup counts."
            action={
              <button
                type="button"
                onClick={onInvite}
                className={inviteButtonClass}
              >
                Invite friends
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            }
          />
        ) : (
          <ul className="mt-8 border-t border-hairline">
            {referrals.map((row) => (
              <ReferralItem key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
