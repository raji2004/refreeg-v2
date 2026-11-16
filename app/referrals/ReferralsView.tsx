"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Share2,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { formatNairaShort } from "@/lib/discover-summary";
import {
  getLeaderboard,
  getReferrerDonorDetail,
  type LeaderboardEntry,
  type ReferrerDonorDetailResult,
} from "@/actions/leaderboard-actions";
import type { ReferralRow } from "@/actions/referral-actions";

const PAGE_SIZE = 20;
const POLL_MS = 30_000;

interface ReferralsViewProps {
  initialTab: "hub" | "leaderboard";
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

// The step art uses lucide icons in the same cream-circle treatment as the
// stat cards below — the old /images/referrals/*.png assets never shipped,
// so referencing them rendered broken images.
const STEPS = [
  {
    icon: MessageCircle,
    alt: "Share",
    text: "Share your referral link with friends and others",
  },
  {
    icon: UserCheck,
    alt: "Sign up",
    text: "They sign up or donate to a verified cause",
  },
  {
    icon: Trophy,
    alt: "Reward",
    text: "Earn rewards & rise on the public leaderboard",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const shortDate = (iso: string | null) =>
  iso ? format(new Date(iso), "d MMM yyyy") : "—";

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
  const [tab, setTab] = useState<"hub" | "leaderboard">(initialTab);
  const [shareOpen, setShareOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaderboard arrives server-rendered; the client only paginates and keeps
  // it fresh while the tab is open.
  const [entries, setEntries] = useState(leaderboard);
  const [totalCount, setTotalCount] = useState(leaderboardTotal);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReferrerDonorDetailResult | null>(null);

  // navigator.share exists only on supported devices; check after mount so
  // server and client render the same markup on first paint.
  useEffect(() => {
    setCanShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  // "Copied!" resets itself after a beat; clear the pending reset on unmount
  // so a closed page can't update state it no longer owns.
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  // Silent refresh of page 1 while the leaderboard is visible — rankings move
  // as donations verify, so a live tab shouldn't go stale for minutes.
  useEffect(() => {
    if (tab !== "leaderboard") return;
    const id = setInterval(async () => {
      try {
        const res = await getLeaderboard({ page: 1, pageSize: PAGE_SIZE });
        setEntries(res.entries);
        setTotalCount(res.totalCount);
        setPage(1);
      } catch {
        // background refresh — stay quiet, next tick may succeed
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [tab]);

  const switchTab = (next: "hub" | "leaderboard") => {
    setTab(next);
    // Keep the deep link (?tab=leaderboard) shareable without a router
    // round trip — the data is already in memory.
    window.history.replaceState(
      null,
      "",
      next === "leaderboard" ? "/referrals?tab=leaderboard" : "/referrals",
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Tap the link field and copy it from there.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: "Join me on RefreeG",
        text: "Join me on RefreeG!",
        url: referralLink,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getLeaderboard({
        page: page + 1,
        pageSize: PAGE_SIZE,
      });
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...res.entries.filter((e) => !seen.has(e.id))];
      });
      setTotalCount(res.totalCount);
      setPage((p) => p + 1);
    } catch {
      toast({ title: "Couldn't load more", variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (referrerId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await getReferrerDonorDetail(referrerId, {
        page: 1,
        pageSize: 50,
      });
      setDetail(res);
    } catch {
      toast({ title: "Couldn't load donor details", variant: "destructive" });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const shareText = "Join me on RefreeG!";
  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `${shareText} ${referralLink}`,
  )}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(
    `${shareText} ${referralLink}`,
  )}`;

  const stats = [
    { label: "Total points", value: points.toLocaleString(), icon: Sparkles },
    { label: "Friends invited", value: invites.toLocaleString(), icon: Users },
    {
      label: "Successful signups",
      value: signUps.toLocaleString(),
      icon: UserCheck,
    },
    {
      label: "Leaderboard rank",
      value: rank ? `#${rank}` : tier,
      icon: Trophy,
    },
  ];

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div>
      {/* Header + tabs */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-fraunces text-3xl font-semibold text-ink sm:text-4xl">
            Referrals
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink/60">
            Invite the people you trust, support meaningful causes, and climb
            the leaderboard together.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-hairline bg-bone p-1">
          <button
            type="button"
            aria-pressed={tab === "hub"}
            onClick={() => switchTab("hub")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "hub"
                ? "bg-surface text-ink shadow-subtle"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <Users className="h-4 w-4" />
            Referral hub
          </button>
          <button
            type="button"
            aria-pressed={tab === "leaderboard"}
            onClick={() => switchTab("leaderboard")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "leaderboard"
                ? "bg-surface text-ink shadow-subtle"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
            <span className="rounded-full bg-cream-muted px-1.5 text-xs text-ink/60">
              {totalCount}
            </span>
          </button>
        </div>
      </header>

      {tab === "hub" ? (
        <div className="space-y-6">
          {/* How it works */}
          <section className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
            <div className="text-center">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-1 font-fraunces text-2xl font-semibold text-ink">
                Three steps to rewards
              </h2>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.alt}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    aria-hidden
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-muted"
                  >
                    <step.icon className="h-7 w-7 text-ink/70" />
                  </div>
                  <p className="mt-3 max-w-[240px] text-sm text-ink/70">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Invite */}
          <section className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
            <Eyebrow>Your referral link</Eyebrow>
            <h2 className="mt-1 font-fraunces text-xl font-semibold text-ink">
              Invite your friends
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Anyone who signs up or gives through your link counts toward your
              rewards.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                readOnly
                aria-label="Referral link"
                value={referralLink}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 font-mono text-xs text-ink/70"
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="surface"
                  onClick={handleCopy}
                  className="rounded-xl"
                >
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="ink"
                  onClick={() => setShareOpen(true)}
                  className="rounded-xl"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Invite friends
                </Button>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-hairline bg-surface p-5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-muted">
                    <Icon className="h-4 w-4 text-ink/70" />
                  </div>
                  <p className="mt-3 text-xs font-medium text-ink/60">
                    {stat.label}
                  </p>
                  <p className="font-fraunces text-2xl font-semibold text-ink">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </section>

          {/* Referrals table */}
          <section className="overflow-hidden rounded-2xl border border-hairline bg-surface">
            <div className="border-b border-hairline px-6 py-4">
              <Eyebrow>Your referrals</Eyebrow>
            </div>

            {referrals.length === 0 ? (
              <EmptyState
                className="m-6"
                icon={<Users className="h-6 w-6 text-ink/40" />}
                title="No referrals yet"
                description="Share your link to start earning — every signup counts."
                action={
                  <Button
                    variant="ink"
                    className="rounded-xl"
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Invite friends
                  </Button>
                }
              />
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/50 sm:grid">
                  <span>Friend</span>
                  <span>Registered</span>
                  <span>Date</span>
                  <span className="text-right">Reward</span>
                </div>
                <div className="divide-y divide-hairline">
                  {referrals.map((row) => {
                    const name =
                      row.profiles?.first_name ||
                      row.referee_email?.split("@")[0] ||
                      "Invited friend";
                    const registered = !!row.registered;
                    const issued = row.reward_status === "ISSUED";
                    return (
                      <div
                        key={row.id}
                        className="flex flex-col gap-2 px-6 py-4 sm:grid sm:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr] sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {name}
                          </p>
                          {row.referee_email && (
                            <p className="truncate text-xs text-ink/50">
                              {row.referee_email}
                            </p>
                          )}
                        </div>
                        <div>
                          <Badge variant={registered ? "verified" : "held"}>
                            {registered ? "Registered" : "Invited"}
                          </Badge>
                        </div>
                        <span className="text-xs text-ink/60 sm:text-sm">
                          {shortDate(row.created_at)}
                        </span>
                        <div className="sm:text-right">
                          {issued ? (
                            <span className="text-sm font-semibold text-forest">
                              +5 pts
                            </span>
                          ) : (
                            <Badge variant="pending">KYC pending</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Leaderboard header */}
          <section className="rounded-2xl border border-hairline bg-surface p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Eyebrow>Live rankings</Eyebrow>
                <h2 className="mt-1 font-fraunces text-2xl font-semibold text-ink">
                  Top referrers
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Ranked by confirmed donations from the donors they bring to
                  verified causes.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-hairline bg-cream px-5 py-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/50">
                  Your rank
                </p>
                <p className="font-fraunces text-xl font-semibold text-ink">
                  {rank ? `#${rank}` : "—"}
                </p>
                <p className="text-xs text-ink/60">
                  {rank
                    ? `${referralCount} ${
                        referralCount === 1 ? "referral" : "referrals"
                      }`
                    : "Not ranked yet"}
                </p>
              </div>
            </div>
          </section>

          {entries.length === 0 ? (
            <EmptyState
              variant="page"
              className="py-16"
              icon={<Trophy className="h-7 w-7" />}
              title="No champions yet"
              description="Be the first to share your link and refer donors — the top spot is open."
              action={
                <Button
                  variant="ink"
                  className="rounded-xl"
                  onClick={() => switchTab("hub")}
                >
                  Get my referral link
                </Button>
              }
            />
          ) : (
            <>
              {/* Podium: 2nd · 1st · 3rd */}
              <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
                {topThree.map((entry, index) => {
                  const place = index + 1;
                  const first = place === 1;
                  return (
                    <div
                      key={entry.id}
                      className={
                        first
                          ? "rounded-2xl border border-sand bg-sand/30 p-5 sm:pb-6 sm:pt-5"
                          : "rounded-2xl border border-hairline bg-surface p-5"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant={first ? "cleared" : "held"}>
                          {first ? "1st" : place === 2 ? "2nd" : "3rd"}
                        </Badge>
                        <Trophy
                          className={
                            first ? "h-4 w-4 text-amber" : "h-4 w-4 text-ink/30"
                          }
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-hairline">
                          <AvatarImage
                            src={entry.profilePhoto ?? undefined}
                            alt={entry.fullName}
                          />
                          <AvatarFallback className="bg-cream-muted text-sm font-semibold text-ink">
                            {initials(entry.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">
                            {entry.fullName}
                          </p>
                          {entry.username && (
                            <p className="truncate text-xs text-ink/50">
                              @{entry.username}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="font-fraunces text-lg font-semibold text-ink">
                            {formatNairaShort(entry.totalAmountDonated)}
                          </p>
                          <p className="text-xs text-ink/60">
                            raised · {entry.successfulReferrals}{" "}
                            {entry.successfulReferrals === 1
                              ? "donor"
                              : "donors"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDetail(entry.id)}
                          className="shrink-0 text-xs font-medium text-blue-accent hover:underline"
                        >
                          View donors
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Positions 4+ */}
              {rest.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
                  <div className="divide-y divide-hairline">
                    {rest.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-5 py-3.5 sm:gap-4"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream-muted text-xs font-semibold text-ink">
                          #{entry.rank}
                        </span>
                        <Avatar className="h-9 w-9 border border-hairline">
                          <AvatarImage
                            src={entry.profilePhoto ?? undefined}
                            alt={entry.fullName}
                          />
                          <AvatarFallback className="bg-cream-muted text-xs font-semibold text-ink">
                            {initials(entry.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">
                            {entry.fullName}
                          </p>
                          {entry.username && (
                            <p className="truncate text-xs text-ink/50">
                              @{entry.username}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-ink">
                            {formatNairaShort(entry.totalAmountDonated)}
                          </p>
                          <p className="text-xs text-ink/50">
                            {entry.successfulReferrals}{" "}
                            {entry.successfulReferrals === 1
                              ? "donor"
                              : "donors"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDetail(entry.id)}
                          className="shrink-0 text-xs font-medium text-blue-accent hover:underline"
                        >
                          View donors
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {entries.length < totalCount && (
                <div className="flex justify-center">
                  <Button
                    variant="subtle"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full px-8"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Share modal */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl">
              Share your link
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl border border-hairline bg-white p-4">
              <QRCode value={referralLink} size={140} />
            </div>
            <p className="w-full truncate rounded-lg bg-cream-muted px-3 py-2 text-center font-mono text-xs text-ink/60">
              {referralLink}
            </p>
          </div>
          <div className="mt-1 space-y-2">
            <Button asChild variant="forest" className="w-full rounded-xl">
              <a href={waHref} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Share on WhatsApp
              </a>
            </Button>
            <Button asChild variant="ink" className="w-full rounded-xl">
              <a href={mailtoHref}>
                <Mail className="mr-2 h-4 w-4" />
                Share by email
              </a>
            </Button>
            {canShare && (
              <Button
                variant="subtle"
                onClick={handleNativeShare}
                className="w-full rounded-xl"
              >
                <Share2 className="mr-2 h-4 w-4" />
                More options
              </Button>
            )}
            <Button
              variant="surface"
              onClick={handleCopy}
              className="w-full rounded-xl"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Donor breakdown modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-fraunces text-xl">
              Donors referred by {detail?.referrer.fullName ?? "this champion"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="py-8 text-center text-sm text-ink/60">
              Loading donors…
            </p>
          ) : detail && detail.donations.length > 0 ? (
            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {detail.donations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-hairline p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {donation.isAnonymous
                        ? "Anonymous donor"
                        : donation.donorName}
                    </p>
                    <p className="truncate text-xs text-ink/50">
                      {donation.cause.title} · {shortDate(donation.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-forest">
                    {formatNairaShort(donation.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-ink/60">
              No donations from their referrals yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
