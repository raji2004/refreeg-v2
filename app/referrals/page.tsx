import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Share2 } from "lucide-react";
import { auth } from "@/lib/auth/auth";
import { getReferralDashboardData } from "@/actions/referral-actions";
import {
  getCurrentUserRank,
  getLeaderboard,
} from "@/actions/leaderboard-actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState
          variant="page"
          className="py-16"
          icon={<Share2 className="h-7 w-7" />}
          title="Referrals live with your account"
          description="Sign in to get your referral link, track the friends you invite, and climb the community leaderboard."
          action={
            <Button asChild variant="ink" className="rounded-xl">
              <Link href="/auth/signin?redirect=%2Freferrals">Sign in</Link>
            </Button>
          }
        />
      </div>
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
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
