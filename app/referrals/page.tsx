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
import { HeroBadge } from "@/components/marketing/HeroBadge";
import { Heading, Lead } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { leaderboardPageSize } from "@/lib/options/referral.options";
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
        <HeroBadge>Referrals live with your account</HeroBadge>
        <Heading as="h1" size="display" className="mt-6">
          Bring your people.
          <br />
          <em className="text-blue-accent">Climb together.</em>
        </Heading>
        <Lead className="mt-5 max-w-xl">
          Sign in to get your referral link, track the friends you invite, and
          climb the community leaderboard.
        </Lead>
        <Button asChild variant="accent" size="pill" className="mt-8 px-8">
          <Link href="/auth/signin?redirect=%2Freferrals">
            Sign in
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  const [data, leaderboard, rank] = await Promise.all([
    getReferralDashboardData(),
    getLeaderboard({ page: 1, pageSize: leaderboardPageSize }),
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
        leaderboard={leaderboard}
      />
    </div>
  );
}
