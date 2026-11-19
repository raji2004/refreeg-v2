"use client";

import { useCallback, useState } from "react";

import type { LeaderboardEntry } from "@/actions/users/leaderboard-actions";
import type { ReferralRow } from "@/actions/users/referral-actions";
import { Heading, Lead } from "@/components/marketing/Typography";
import { cn } from "@/lib/utils";

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
  leaderboard: LeaderboardEntry[];
  leaderboardTotal: number;
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
  leaderboardTotal,
}: ReferralsViewProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [shareOpen, setShareOpen] = useState(false);
  const [board, setBoard] = useState({
    entries: leaderboard,
    totalCount: leaderboardTotal,
  });

  const setBoardEntries = useCallback(
    (entries: LeaderboardEntry[], totalCount: number) =>
      setBoard({ entries, totalCount }),
    [],
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    // Keep ?tab=leaderboard shareable without a router round trip.
    window.history.replaceState(
      null,
      "",
      next === "leaderboard" ? "/referrals?tab=leaderboard" : "/referrals",
    );
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "hub", label: "Referral hub" },
    { id: "leaderboard", label: "Leaderboard", count: board.totalCount },
  ];

  const stats = [
    { label: "Total points", value: points.toLocaleString() },
    { label: "Friends invited", value: invites.toLocaleString() },
    { label: "Successful signups", value: signUps.toLocaleString() },
    { label: "Leaderboard rank", value: rank ? `#${rank}` : tier },
  ];

  return (
    <div>
      <header className="pb-10 pt-6 md:pb-14 md:pt-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-ink shadow-md sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
          Earn as you share
        </span>
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

      <nav
        aria-label="Referrals sections"
        className="mb-12 flex gap-8 border-b border-hairline md:mb-16"
      >
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => switchTab(id)}
            className={cn(
              "-mb-px flex items-baseline gap-2 border-b-2 pb-4 text-sm font-medium transition-colors",
              tab === id
                ? "border-blue-accent text-ink"
                : "border-transparent text-ink/50 hover:text-ink",
            )}
          >
            {label}
            {count !== undefined && (
              <span className="font-fraunces text-xs italic text-ink/50">
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "hub" ? (
        <ReferralHub
          referralLink={referralLink}
          stats={stats}
          referrals={referrals}
          onInvite={() => setShareOpen(true)}
        />
      ) : (
        <ReferralLeaderboard
          entries={board.entries}
          totalCount={board.totalCount}
          onEntriesChange={setBoardEntries}
          rank={rank}
          referralCount={referralCount}
          onGetLink={() => switchTab("hub")}
        />
      )}

      <ShareLinkDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        referralLink={referralLink}
      />
    </div>
  );
}
