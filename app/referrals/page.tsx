import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getReferralDashboardData } from "@/actions/users/referral-actions";
import {
  getCurrentUserRank,
  getLeaderboard,
} from "@/actions/users/leaderboard-actions";
import { Heading, Lead } from "@/components/marketing/Typography";
import { ReferralsView } from "./ReferralsView";

export const metadata: Metadata = {
  title: "Referrals",
  description:
    "Invite friends to RefreeG, earn points, and climb the community leaderboard.",
};

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab }, session] = await Promise.all([searchParams, auth()]);
  const user = session?.user;

  if (!user?.id) {
    return (
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28">
        <span className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-ink shadow-md sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
          Referrals live with your account
        </span>
        <Heading as="h1" size="display" className="mt-6">
          Bring your people.
          <br />
          <em className="text-blue-accent">Climb together.</em>
        </Heading>
        <Lead className="mt-5 max-w-xl">
          Sign in to get your referral link, track the friends you invite, and
          climb the community leaderboard.
        </Lead>
        <Link
          href="/auth/signin?redirect=%2Freferrals"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-blue-accent px-8 py-3.5 text-sm font-medium text-white shadow-xl transition-colors hover:bg-blue-accent/90"
        >
          Sign in
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  const [data, leaderboard, rank] = await Promise.all([
    getReferralDashboardData(),
    getLeaderboard({ page: 1, pageSize: 20 }),
    getCurrentUserRank(user.id),
  ]);
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const referralLink =
    data?.referralLink && data.referralLink.startsWith("http")
      ? data.referralLink
      : `${origin}${data?.referralLink ?? ""}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <ReferralsView
        initialTab={tab === "leaderboard" ? "leaderboard" : "hub"}
        referralLink={referralLink}
        points={data?.points ?? 0}
        invites={data?.invites ?? 0}
        signUps={data?.signUps ?? 0}
        tier={data?.tier ?? "Tier 1"}
        rank={rank.rank}
        referralCount={rank.referralCount}
        referrals={data?.referrals ?? []}
        leaderboard={leaderboard.entries}
        leaderboardTotal={leaderboard.totalCount}
      />
    </div>
  );
}
