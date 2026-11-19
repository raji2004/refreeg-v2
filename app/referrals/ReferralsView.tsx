"use client";

import { useState } from "react";

import type { LeaderboardResult } from "@/actions/users/leaderboard-actions";
import type { ReferralRow } from "@/actions/users/referral-actions";
import { HeroBadge } from "@/components/marketing/HeroBadge";
import { Heading, Lead } from "@/components/marketing/Typography";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboard } from "@/hooks/use-referrals";

import { ReferralHub } from "./_components/ReferralHub";
import { ReferralLeaderboard } from "./_components/ReferralLeaderboard";
import { ShareLinkDialog } from "./_components/ShareLinkDialog";

type Tab = "hub" | "leaderboard";

interface ReferralsViewProps {
  initialTab: Tab;
  referralLink: string;
  points: number;
  invites: number;
  signUps: number;
  tier: string;
  rank: number | null;
  referralCount: number;
  referrals: ReferralRow[];
  leaderboard: LeaderboardResult;
}

export function ReferralsView({
  initialTab,
  referralLink,
  points,
  invites,
  signUps,
  tier,
  rank,
  referralCount,
  referrals,
  leaderboard,
}: ReferralsViewProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [shareOpen, setShareOpen] = useState(false);
  const board = useLeaderboard(leaderboard, tab === "leaderboard");

  const switchTab = (next: Tab) => {
    setTab(next);
    // Keep ?tab=leaderboard shareable without a router round trip.
    window.history.replaceState(
      null,
      "",
      next === "leaderboard" ? "/referrals?tab=leaderboard" : "/referrals",
    );
  };

  const stats = [
    { label: "Total points", value: points.toLocaleString() },
    { label: "Friends invited", value: invites.toLocaleString() },
    { label: "Successful signups", value: signUps.toLocaleString() },
    { label: "Leaderboard rank", value: rank ? `#${rank}` : tier },
  ];

  return (
    <div>
      <header className="pb-10 pt-6 md:pb-14 md:pt-10">
        <HeroBadge>Earn as you share</HeroBadge>
        <Heading as="h1" size="display" className="mt-6">
          Bring your people.
          <br />
          <em className="text-blue-accent">Climb together.</em>
        </Heading>
        <Lead className="mt-5 max-w-xl">
          Invite the people you trust, support meaningful causes, and rise on
          the leaderboard as they give.
        </Lead>
      </header>

      <Tabs value={tab} onValueChange={(value) => switchTab(value as Tab)}>
        <TabsList variant="underline" className="mb-12 md:mb-16">
          <TabsTrigger variant="underline" value="hub">
            Referral hub
          </TabsTrigger>
          <TabsTrigger variant="underline" value="leaderboard">
            Leaderboard
            <span className="font-fraunces text-xs italic text-ink/50">
              {board.totalCount}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hub" className="mt-0">
          <ReferralHub
            referralLink={referralLink}
            stats={stats}
            referrals={referrals}
            onInvite={() => setShareOpen(true)}
          />
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-0">
          <ReferralLeaderboard
            board={board}
            rank={rank}
            referralCount={referralCount}
            onGetLink={() => switchTab("hub")}
          />
        </TabsContent>
      </Tabs>

      <ShareLinkDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        referralLink={referralLink}
      />
    </div>
  );
}
