"use client";

import { useState } from "react";
import { Trophy } from "lucide-react";

import { Heading } from "@/components/marketing/Typography";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { useLeaderboard } from "@/hooks/use-referrals";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import { cn } from "@/lib/utils";

import { DonorBreakdownDialog } from "./DonorBreakdownDialog";
import { LeaderboardIdentity } from "./LeaderboardIdentity";
import { ViewDonorsLink } from "./ViewDonorsLink";

const plural = (count: number, word: string) =>
  `${count.toLocaleString()} ${count === 1 ? word : `${word}s`}`;

export function ReferralLeaderboard({
  board,
  rank,
  referralCount,
  onGetLink,
}: {
  board: ReturnType<typeof useLeaderboard>;
  rank: number | null;
  referralCount: number;
  onGetLink: () => void;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const { entries } = board;

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-16 md:space-y-20">
      <section className="flex flex-col gap-6 rounded-2xl bg-brand-blue px-6 py-10 text-brand-blue-foreground sm:flex-row sm:items-end sm:justify-between sm:px-10 md:py-14">
        <div>
          <p className="text-sm text-brand-blue-foreground/70">Your rank</p>
          <Heading
            as="p"
            size="display"
            className="mt-2 leading-none text-brand-blue-foreground"
          >
            {rank ? (
              <>
                You&apos;re <em className="text-lime">#{rank}.</em>
              </>
            ) : (
              <>
                Not ranked <em className="text-lime">yet.</em>
              </>
            )}
          </Heading>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-brand-blue-foreground/80">
          {rank
            ? `${plural(referralCount, "referral")} so far. Ranked by confirmed donations from the donors you bring.`
            : "Ranked by confirmed donations from the donors you bring to verified causes."}
        </p>
      </section>

      {entries.length === 0 ? (
        <EmptyState
          variant="page"
          className="py-16"
          icon={<Trophy className="h-7 w-7" />}
          title="No champions yet"
          description="Be the first to share your link and refer donors. The top spot is open."
          action={
            <Button
              variant="ink"
              className="rounded-full px-6"
              onClick={onGetLink}
            >
              Get my referral link
            </Button>
          }
        />
      ) : (
        <section>
          <Eyebrow className="mb-3 block">Live rankings</Eyebrow>
          <Heading>
            Top <em>referrers.</em>
          </Heading>

          <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-0">
            {topThree.map((entry, index) => (
              <li
                key={entry.id}
                className={cn(
                  "sm:px-8 sm:first:pl-0",
                  index > 0 && "sm:border-l sm:border-hairline",
                )}
              >
                <span
                  className={cn(
                    "font-fraunces text-7xl italic leading-none",
                    index === 0 ? "text-blue-accent" : "text-ink/20",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <LeaderboardIdentity entry={entry} size="lg" />
                <p className="mt-6 font-fraunces text-3xl text-ink">
                  {formatNairaShort(entry.totalAmountDonated)}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  raised from {plural(entry.successfulReferrals, "donor")}
                </p>
                <ViewDonorsLink onClick={() => setDetailId(entry.id)} />
              </li>
            ))}
          </ol>

          {rest.length > 0 && (
            <ol className="mt-16 border-t border-hairline">
              {rest.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-4 border-b border-hairline py-4"
                >
                  <span className="w-10 shrink-0 font-fraunces text-xl italic text-ink/40">
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <LeaderboardIdentity entry={entry} size="sm" />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-fraunces text-lg text-ink">
                      {formatNairaShort(entry.totalAmountDonated)}
                    </p>
                    <p className="text-xs text-ink/50">
                      {plural(entry.successfulReferrals, "donor")}
                    </p>
                  </div>
                  <ViewDonorsLink
                    onClick={() => setDetailId(entry.id)}
                    compact
                  />
                </li>
              ))}
            </ol>
          )}

          {board.hasMore && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <Button
                variant="outline"
                onClick={board.loadMore}
                disabled={board.loadingMore}
                className="rounded-full border-ink px-8"
              >
                {board.loadingMore ? "Loading…" : "Load more"}
              </Button>
              {board.error && (
                <p className="text-sm text-rust">{board.error}</p>
              )}
            </div>
          )}
        </section>
      )}

      <DonorBreakdownDialog
        referrerId={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
