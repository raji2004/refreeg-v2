"use client";

import React, { useEffect, useState, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { AnimatePresence, motion } from "framer-motion";
import {
  Copy,
  Trophy,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Heart,
  User,
  Calendar,
  ExternalLink,
  ShieldCheck,
  X,
  Share2,
} from "lucide-react";

import {
  sectionVariant,
  stagger,
  fadeUp,
  hoverSoft,
  mobileHover,
  floating,
  rowVariant,
} from "./animations";

import { useAuth } from "@/hooks/use-auth";
import { getReferralDashboardData } from "@/actions/referral-actions";
import {
  getLeaderboard,
  getCurrentUserRank,
  getReferrerDonorDetail,
  LeaderboardEntry,
  ReferrerDonorDetailResult,
} from "@/actions/leaderboard-actions";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type StepProps = {
  src: string;
  alt: string;
  text: string;
  mobile?: boolean;
};

type ReferralRow = {
  id: string;
  referrer_id?: string | null;
  referee_id?: string | null;
  registered: boolean | null;
  referee_email: string | null;
  created_at: string | null;
  reward?: string | null;
  profiles?: {
    first_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  reward_status?: string | null;
};

type DebugInfo = {
  userId?: string;
  userEmail?: string | null;
  rowCount: number;
};

/* -------------------------------------------------------------------------- */
/*                              Reusable Components                           */
/* -------------------------------------------------------------------------- */

const Step: React.FC<StepProps> = ({ src, alt, text, mobile = false }) => (
  <motion.div
    variants={fadeUp}
    className="flex flex-col items-center"
    initial="rest"
    whileHover="hover"
    animate="rest"
  >
    <motion.div variants={mobile ? mobileHover : hoverSoft}>
      <Image src={src} width={70} height={70} alt={alt} />
    </motion.div>
    <p className="mt-3 w-48 text-center text-sm text-gray-700">{text}</p>
    {mobile && <div className="mt-6 h-16 w-1 bg-blue-600" />}
  </motion.div>
);

const CopyToast: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed bottom-7 left-1/2 z-[50] -translate-x-1/2 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg"
      >
        Copied!
      </motion.div>
    )}
  </AnimatePresence>
);

/* -------------------------------------------------------------------------- */
/*                               Referral Page                                */
/* -------------------------------------------------------------------------- */

export default function ReferralPage() {
  const { user } = useAuth();

  // Active Tab: "hub" (My Referrals) vs "leaderboard" (Public Leaderboard)
  const [activeTab, setActiveTab] = useState<"hub" | "leaderboard">("hub");

  // User Referral Data
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [points, setPoints] = useState(0);
  const [invites, setInvites] = useState(0);
  const [signUps, setSignUps] = useState(0);
  const [tier, setTier] = useState("Tier 1");
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isQREnlarged, setIsQREnlarged] = useState(false);
  const [debug, setDebug] = useState<DebugInfo>({ rowCount: 0 });

  // Leaderboard Data
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >([]);
  const [totalLeaderboardCount, setTotalLeaderboardCount] = useState<number>(0);
  const [leaderboardPage, setLeaderboardPage] = useState<number>(1);
  const [leaderboardPageSize] = useState<number>(20);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(true);
  const [leaderboardLoadingMore, setLeaderboardLoadingMore] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userRank, setUserRank] = useState<{
    rank: number | null;
    referralCount: number;
  }>({ rank: null, referralCount: 0 });

  // Referrer Detail Modal State
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(
    null,
  );
  const [referrerDetail, setReferrerDetail] =
    useState<ReferrerDonorDetailResult | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  /* ------------------------------------------------------------------------ */
  /*                             Load User Referrals                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await getReferralDashboardData();

        if (!data) {
          setLoading(false);
          return;
        }

        const baseUrl =
          typeof window !== "undefined" ? window.location.origin : "";
        const resolvedReferralLink = data.referralLink.startsWith("http")
          ? data.referralLink
          : `${baseUrl}${data.referralLink}`;

        setReferralLink(resolvedReferralLink);
        setReferrals(data.referrals as ReferralRow[]);
        setInvites(data.invites);
        setSignUps(data.signUps);
        setPoints(data.points);
        setTier(data.tier);
        setDebug({
          userId: user.id,
          userEmail: user.email,
          rowCount: data.referrals.length,
        });
      } catch (err) {
        console.error("Unexpected error loading referrals:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  /* ------------------------------------------------------------------------ */
  /*                            Load Leaderboard Data                         */
  /* ------------------------------------------------------------------------ */

  const fetchLeaderboard = useCallback(
    async (targetPage = 1, append = false, isBackground = false) => {
      if (!isBackground && !append) setLeaderboardLoading(true);
      if (append) setLeaderboardLoadingMore(true);
      if (isBackground) setIsRefreshing(true);

      try {
        const res = await getLeaderboard({
          page: targetPage,
          pageSize: leaderboardPageSize,
        });

        if (append) {
          setLeaderboardEntries((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEntries = res.entries.filter(
              (e) => !existingIds.has(e.id),
            );
            return [...prev, ...newEntries];
          });
        } else {
          setLeaderboardEntries(res.entries);
        }

        setTotalLeaderboardCount(res.totalCount);
        setLeaderboardPage(targetPage);
      } catch (err) {
        console.error("Failed to load leaderboard from database:", err);
      } finally {
        setLeaderboardLoading(false);
        setLeaderboardLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [leaderboardPageSize],
  );

  // Check URL search params for ?tab=leaderboard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "leaderboard") {
        setActiveTab("leaderboard");
      }
    }
  }, []);

  // Fetch leaderboard & user rank on mount
  useEffect(() => {
    fetchLeaderboard(1, false);

    if (user?.id) {
      getCurrentUserRank(user.id)
        .then((res) => {
          setUserRank(res);
        })
        .catch((err) => {
          console.error("Failed to get current user rank:", err);
        });
    }
  }, [fetchLeaderboard, user?.id]);

  // 30s auto-refresh polling for leaderboard
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard(1, false, true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  // Open Referrer Donor Breakdown Modal
  const handleOpenReferrerDetail = async (referrerId: string) => {
    setSelectedReferrerId(referrerId);
    setDetailLoading(true);
    try {
      const details = await getReferrerDonorDetail(referrerId, {
        page: 1,
        pageSize: 50,
      });
      setReferrerDetail(details);
    } catch (e) {
      console.error("Failed to load referrer details:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                               Event Handlers                             */
  /* ------------------------------------------------------------------------ */

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInviteFriends = () => {
    if (!referralLink) return;
    setShareOpen(true);
  };

  const topThree = leaderboardEntries.slice(0, 3);
  const restEntries = leaderboardEntries.slice(3);

  /* ------------------------------------------------------------------------ */
  /*                                   Render                                 */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="w-full overflow-x-hidden bg-[#F7F8FC] pb-28 min-h-screen">
      {/* HERO */}
      <motion.section
        className="mx-auto max-w-6xl px-5 pt-16 text-center"
        variants={sectionVariant}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <motion.div
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-1.5 shadow-sm"
        >
          <motion.div {...floating}>
            <Image
              src="/images/referrals/Users.png"
              width={20}
              height={20}
              alt="users"
            />
          </motion.div>
          <span className="text-xs sm:text-sm font-medium text-gray-800">
            Share your link for rewards & impact
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="mt-6 text-3xl font-extrabold md:text-4xl text-gray-900"
        >
          RefreeG’s Referral Program
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mx-auto mt-3 max-w-xl text-sm text-gray-600 md:text-base"
        >
          At RefreeG, we believe in the power of community-driven change. Invite
          people you trust, support meaningful campaigns, and climb the
          leaderboard together.
        </motion.p>

        {/* Tab Selector: My Referral Hub vs Community Leaderboard */}
        <motion.div
          variants={fadeUp}
          className="mt-8 flex justify-center items-center"
        >
          <div className="inline-flex rounded-full bg-gray-200/80 p-1.5 shadow-inner border border-gray-300">
            <button
              onClick={() => setActiveTab("hub")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "hub"
                  ? "bg-white text-[#0B3B8A] shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>My Referral Hub</span>
            </button>

            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition-all ${
                activeTab === "leaderboard"
                  ? "bg-[#CFF454] text-[#0B1410] shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>Community Leaderboard</span>
              <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                {totalLeaderboardCount}
              </span>
            </button>
          </div>
        </motion.div>
      </motion.section>

      {/* ==================================================================== */}
      {/* TAB 1: MY REFERRAL HUB                                               */}
      {/* ==================================================================== */}
      {activeTab === "hub" && (
        <>
          {/* HOW IT WORKS */}
          <motion.section
            className="mx-auto mt-12 max-w-6xl px-5"
            variants={sectionVariant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              variants={fadeUp}
              className="rounded-2xl bg-white p-8 shadow md:p-10"
            >
              <h2 className="mb-10 text-[26px] md:text-[32px] font-bold text-center w-full text-gray-900">
                How it works
              </h2>

              {/* Desktop timeline */}
              <div className="hidden items-start justify-between md:flex">
                <Step
                  src="/images/referrals/message-notification.png"
                  alt="Share"
                  text="Share your referral link with friends and others"
                />
                <Step
                  src="/images/referrals/user-add.png"
                  alt="Sign up"
                  text="They sign up or donate to a verified cause"
                />
                <Step
                  src="/images/referrals/medal-star.png"
                  alt="Reward"
                  text="Earn rewards & rise on the public leaderboard"
                />
              </div>

              {/* Mobile timeline */}
              <div className="flex flex-col items-center gap-6 md:hidden">
                <Step
                  src="/images/referrals/message-notification.png"
                  alt="Share"
                  text="Share your referral link with friends"
                  mobile
                />
                <Step
                  src="/images/referrals/user-add.png"
                  alt="Sign up"
                  text="They sign up or donate to a verified cause"
                  mobile
                />
                <Step
                  src="/images/referrals/medal-star.png"
                  alt="Reward"
                  text="Earn rewards & rise on the public leaderboard"
                />
              </div>
            </motion.div>
          </motion.section>

          {/* SHARE BANNER */}
          <motion.section
            className="mx-auto mt-14 max-w-6xl px-5"
            variants={sectionVariant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-between rounded-2xl bg-white p-6 shadow md:flex-row md:p-8"
            >
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold md:text-xl text-gray-900">
                  Invite your friends
                </h3>
                <p className="mt-1 text-xs text-gray-500 md:text-sm">
                  Insert your email or share your link to get rewards.
                </p>
              </div>

              <div className="mt-4 flex w-full flex-col gap-3 md:mt-0 md:w-auto md:flex-row md:items-center">
                <div className="flex w-full items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-xs md:w-80 md:text-sm">
                  <span className="truncate text-gray-600 font-mono">
                    {referralLink || "Loading your link..."}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="ml-2 flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Copy size={16} />
                  </button>
                </div>

                <button
                  onClick={handleInviteFriends}
                  className="rounded-md bg-[#0B3B8A] px-5 py-2 text-sm text-white shadow transition hover:bg-[#0D46A5] active:scale-95 font-semibold"
                >
                  Invite Friends
                </button>
              </div>
            </motion.div>
          </motion.section>

          {/* STATS */}
          <motion.section
            className="mx-auto mt-14 max-w-6xl px-5"
            variants={sectionVariant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              variants={stagger}
              className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
            >
              {[
                { label: "Total Points", value: points, img: "money-bag.png" },
                {
                  label: "Friends Invited",
                  value: invites,
                  img: "add-group.png",
                },
                { label: "Successful Signups", value: signUps, img: "id.png" },
                {
                  label: "Current Standing",
                  value: userRank.rank ? `#${userRank.rank}` : tier,
                  img: "medal-cup.png",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={fadeUp}
                  whileHover="hover"
                  className="flex flex-col items-center rounded-2xl bg-white p-5 shadow text-center"
                >
                  <motion.div variants={hoverSoft}>
                    <Image
                      src={`/images/referrals/${item.img}`}
                      width={50}
                      height={50}
                      alt={item.label}
                    />
                  </motion.div>
                  <p className="mt-2 text-xs text-gray-500 font-medium">
                    {item.label}
                  </p>
                  <p className="text-xl font-extrabold text-gray-900">
                    {item.value}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>

          {/* TABLE: MY REFERRALS */}
          <motion.section
            className="mx-auto mt-14 max-w-6xl px-5"
            variants={sectionVariant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.div
              className="overflow-hidden rounded-2xl bg-white shadow"
              variants={fadeUp}
            >
              {/* Header */}
              <div className="grid grid-cols-4 bg-[#0065FF] px-4 py-3 text-xs font-semibold text-white md:text-sm">
                <span>Friends Account</span>
                <span>Registered</span>
                <span>Reg Date</span>
                <span>Rewards</span>
              </div>

              {/* Body */}
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  Loading data...
                </div>
              ) : referrals.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No referrals yet. Share your link to start earning!
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {referrals.map((ref) => {
                    const profile = ref.profiles;
                    const name =
                      profile?.first_name ||
                      ref.referee_email?.split("@")[0] ||
                      "Pending User";
                    const email = ref.referee_email || "Unknown";
                    const registered = !!ref.registered;
                    const date = ref.created_at
                      ? new Date(ref.created_at).toLocaleDateString()
                      : "—";
                    const reward =
                      ref.reward_status === "ISSUED" ? "+5 pts" : "Pending KYC";

                    return (
                      <div
                        key={ref.id}
                        className="grid grid-cols-4 items-center gap-2 px-4 py-3 text-xs text-gray-700 md:text-sm hover:bg-gray-50/80 transition-colors"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-semibold text-gray-900">
                            {name}
                          </span>
                          <span className="truncate text-[11px] text-gray-400">
                            {email}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              registered
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {registered ? "Yes" : "No"}
                          </span>
                        </div>
                        <span className="text-gray-500">{date}</span>
                        <span
                          className={`font-semibold ${
                            ref.reward_status === "ISSUED"
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          {reward}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.section>
        </>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: COMMUNITY LEADERBOARD                                         */}
      {/* ==================================================================== */}
      {activeTab === "leaderboard" && (
        <motion.section
          className="mx-auto mt-10 max-w-5xl px-5"
          variants={sectionVariant}
          initial="hidden"
          animate="show"
        >
          {/* Quick Header Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl shadow border border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#CFF454] px-3 py-1 text-xs font-bold text-[#0B1410]">
                  Live Rankings
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                Top Referral Champions
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Ranked by confirmed donor referrals brought to verified causes.
              </p>
            </div>

            {user?.id && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-center sm:text-right shrink-0">
                <p className="text-[11px] font-medium text-gray-500 uppercase">
                  Your Rank
                </p>
                <p className="text-base font-extrabold text-[#0B3B8A]">
                  {userRank.rank
                    ? `#${userRank.rank} (${userRank.referralCount} ${userRank.referralCount === 1 ? "referral" : "referrals"})`
                    : "Not ranked yet"}
                </p>
              </div>
            )}
          </div>

          {/* Loading */}
          {leaderboardLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-2xl bg-white animate-pulse shadow"
                  />
                ))}
              </div>
              <div className="h-48 rounded-2xl bg-white animate-pulse shadow" />
            </div>
          ) : leaderboardEntries.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl bg-white p-12 text-center shadow border border-gray-100">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#CFF454]/20 text-[#0B1410] mb-4">
                <Trophy className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                No Referral Champions Yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                Be the first to share your link and refer donors to claim the #1
                spot!
              </p>
              <Button
                onClick={() => setActiveTab("hub")}
                className="mt-5 bg-[#0B3B8A] font-semibold text-white"
              >
                Get My Referral Link
              </Button>
            </div>
          ) : (
            <div>
              {/* Top 3 Podiums */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 items-end">
                {/* 2nd Place */}
                {topThree[1] && (
                  <PodiumCard
                    entry={topThree[1]}
                    position="second"
                    badge="🥈 2nd Place"
                    glow="border-gray-200 bg-white"
                    onViewDonors={() =>
                      handleOpenReferrerDetail(topThree[1].id)
                    }
                  />
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <PodiumCard
                    entry={topThree[0]}
                    position="first"
                    badge="👑 Champion"
                    glow="border-amber-300 bg-gradient-to-b from-amber-50/60 via-white to-white shadow-lg sm:-translate-y-2"
                    onViewDonors={() =>
                      handleOpenReferrerDetail(topThree[0].id)
                    }
                  />
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <PodiumCard
                    entry={topThree[2]}
                    position="third"
                    badge="🥉 3rd Place"
                    glow="border-gray-200 bg-white"
                    onViewDonors={() =>
                      handleOpenReferrerDetail(topThree[2].id)
                    }
                  />
                )}
              </div>

              {/* Rest of the Leaderboard Table */}
              {restEntries.length > 0 && (
                <div className="overflow-hidden rounded-2xl bg-white shadow border border-gray-100">
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1 text-center">Rank</div>
                    <div className="col-span-5">Champion</div>
                    <div className="col-span-4 text-right">Amount Raised</div>
                    <div className="col-span-2 text-right">Details</div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {restEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 px-4 sm:px-6 py-4 items-center hover:bg-gray-50/80 transition-colors"
                      >
                        {/* Rank */}
                        <div className="flex sm:col-span-1 items-center justify-between sm:justify-center w-full sm:w-auto">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-800">
                            #{entry.rank}
                          </span>
                          <span className="sm:hidden text-xs font-bold text-green-700">
                            ₦{entry.totalAmountDonated.toLocaleString()}
                          </span>
                        </div>

                        {/* Name & Avatar */}
                        <div className="flex sm:col-span-5 items-center gap-3 w-full">
                          <AvatarOrInitials
                            name={entry.fullName}
                            photoUrl={entry.profilePhoto}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {entry.fullName}
                            </p>
                            {entry.username && (
                              <p className="truncate text-xs text-gray-400">
                                @{entry.username}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount & Donors Count (Desktop) */}
                        <div className="hidden sm:flex sm:col-span-4 flex-col items-end justify-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#CFF454]/25 px-2.5 py-0.5 text-xs font-extrabold text-[#0B1410] border border-[#CFF454]/50">
                            ₦{entry.totalAmountDonated.toLocaleString()} Raised
                          </span>
                          <span className="text-[11px] text-gray-400 mt-0.5">
                            {entry.successfulReferrals}{" "}
                            {entry.successfulReferrals === 1
                              ? "Donor"
                              : "Donors"}
                          </span>
                        </div>

                        {/* View Action */}
                        <div className="flex sm:col-span-2 items-center justify-end w-full sm:w-auto">
                          <button
                            onClick={() => handleOpenReferrerDetail(entry.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <span>View Donors</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Load More Button */}
              {leaderboardEntries.length < totalLeaderboardCount && (
                <div className="mt-8 flex justify-center">
                  <Button
                    onClick={() => fetchLeaderboard(leaderboardPage + 1, true)}
                    disabled={leaderboardLoadingMore}
                    variant="outline"
                    className="rounded-full bg-white font-semibold shadow-sm border-gray-300 px-8 hover:bg-gray-50"
                  >
                    {leaderboardLoadingMore
                      ? "Loading..."
                      : "Load More Champions"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.section>
      )}

      {/* COPY TOAST */}
      <CopyToast visible={copied} />

      {/* SHARE MODAL */}
      <AnimatePresence>
        {shareOpen && referralLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2 className="mb-1 text-center text-lg font-semibold">
                Share Your Link
              </h2>
              <p className="mb-4 text-center text-xs text-gray-500">
                Invite friends to join RefreeG with your personal link.
              </p>

              <div className="mb-4 flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1.5 text-[11px] text-gray-500">
                <span className="truncate">{referralLink}</span>
              </div>

              {/* QR Code in Modal */}
              <div className="mb-6 flex flex-col items-center justify-center">
                <p className="mb-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Your QR Code
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsQREnlarged(true)}
                  className="cursor-pointer rounded-2xl bg-white p-4 shadow-md border border-gray-100"
                >
                  <QRCode value={referralLink} size={120} />
                  <p className="mt-2 text-center text-[10px] text-blue-600 font-medium">
                    Click to enlarge
                  </p>
                </motion.div>
              </div>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Join me on RefreeG! ${referralLink}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2 text-sm font-medium text-white transition hover:bg-[#1EB257]"
                >
                  <span>Share on WhatsApp</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent(
                    "Join me on RefreeG",
                  )}&body=${encodeURIComponent(referralLink)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] py-2 text-sm font-medium text-white transition hover:bg-[#1D4ED8]"
                >
                  <span>Share via Email</span>
                </a>

                <button
                  onClick={handleCopy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  <span>Copy Link</span>
                </button>
              </div>

              <button
                onClick={() => setShareOpen(false)}
                className="mt-4 w-full text-center text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENLARGED QR OVERLAY */}
      <AnimatePresence>
        {isQREnlarged && referralLink && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={() => setIsQREnlarged(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center rounded-3xl bg-white p-8 shadow-2xl"
            >
              <button
                onClick={() => setIsQREnlarged(false)}
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-lg hover:text-black"
              >
                ✕
              </button>
              <QRCode value={referralLink} size={280} />
              <p className="mt-6 text-center text-sm font-semibold text-gray-800">
                Scan to join RefreeG
              </p>
              <p className="mt-1 text-center text-xs text-gray-500">
                Share this QR code with your friends
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* REFERRED DONORS BREAKDOWN MODAL                                      */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {selectedReferrerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReferrerId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-gray-50/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CFF454] text-[#0B1410] font-bold shadow-sm">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={getProfileHref(
                        referrerDetail?.referrer.username,
                        referrerDetail?.referrer.id,
                      )}
                      className="font-bold text-gray-900 text-base truncate block hover:text-blue-600 hover:underline transition-colors"
                    >
                      {referrerDetail?.referrer.fullName || "Champion Details"}
                    </Link>
                    <p className="text-xs text-gray-500 font-medium">
                      <span className="font-extrabold text-green-700">
                        ₦
                        {(
                          referrerDetail?.referrer.totalAmountDonated || 0
                        ).toLocaleString()}{" "}
                        Total Raised
                      </span>
                      {" • "}
                      <span>
                        {referrerDetail?.totalCount || 0} Referred Donors
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedReferrerId(null)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-gray-800 transition-colors shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-5 space-y-3 flex-1">
                {detailLoading ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Loading referred donors...
                  </div>
                ) : !referrerDetail || referrerDetail.donations.length === 0 ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    No confirmed donor records found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {referrerDetail.donations.map((d) => (
                      <div
                        key={d.id}
                        className="py-3.5 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                            {d.isAnonymous ? (
                              <User className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Heart className="h-4 w-4 text-rose-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-900 truncate">
                                {d.donorName}
                              </p>
                              {d.isAnonymous && (
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.2 text-[9px] font-medium text-gray-500 shrink-0">
                                  Anonymous
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5 min-w-0">
                              <span className="shrink-0 font-medium">
                                Cause:
                              </span>
                              <Link
                                href={`/causes/${d.cause.slug || d.cause.id}`}
                                className="font-semibold text-blue-600 hover:underline hover:text-blue-800 inline-flex items-center gap-1 min-w-0 truncate"
                                title={d.cause.title}
                              >
                                <span className="truncate">
                                  {d.cause.title}
                                </span>
                                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              </Link>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-extrabold text-green-700 border border-green-200 shadow-sm">
                            ₦{d.amount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(d.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 p-4 bg-gray-50 text-right">
                <Button
                  onClick={() => setSelectedReferrerId(null)}
                  variant="outline"
                  size="sm"
                  className="rounded-full font-semibold"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Helper Components                            */
/* -------------------------------------------------------------------------- */

function getProfileHref(username?: string | null, id?: string) {
  if (username) return `/${username}`;
  if (id) return `/${id}`;
  return "#";
}

function PodiumCard({
  entry,
  position,
  badge,
  glow,
  onViewDonors,
}: {
  entry: LeaderboardEntry;
  position: "first" | "second" | "third";
  badge: string;
  glow: string;
  onViewDonors: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-2xl border p-6 text-center shadow-sm ${glow}`}
    >
      <span className="mb-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">
        {badge}
      </span>

      <Link
        href={getProfileHref(entry.username, entry.id)}
        className="group flex flex-col items-center hover:opacity-90 transition-opacity"
      >
        <div className="relative my-2">
          <AvatarOrInitials
            name={entry.fullName}
            photoUrl={entry.profilePhoto}
            size="lg"
          />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 text-xs font-extrabold text-gray-900 shadow">
            #{entry.rank}
          </span>
        </div>

        <h3 className="mt-2 text-sm font-bold text-gray-900 truncate max-w-[180px] group-hover:text-blue-600 transition-colors">
          {entry.fullName}
        </h3>
        {entry.username && (
          <p className="text-[11px] text-gray-400">@{entry.username}</p>
        )}
      </Link>

      {/* Amount Raised & Donor Count */}
      <div className="mt-3 flex flex-col items-center gap-1">
        <div className="inline-flex items-center gap-1 rounded-full bg-[#CFF454] px-3.5 py-1 text-xs font-extrabold text-[#0B1410] shadow-sm">
          <span>₦{entry.totalAmountDonated.toLocaleString()} Raised</span>
        </div>
        <span className="text-[11px] text-gray-500 font-medium">
          {entry.successfulReferrals}{" "}
          {entry.successfulReferrals === 1 ? "Donor" : "Donors"}
        </span>
      </div>

      <button
        onClick={onViewDonors}
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
      >
        <span>View Donors</span>
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function AvatarOrInitials({
  name,
  photoUrl,
  size = "md",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  }[size];

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (photoUrl) {
    return (
      <div
        className={`relative overflow-hidden rounded-full border border-gray-200 shadow-sm ${sizeClasses}`}
      >
        <Image
          src={photoUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="56px"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-[#0B3B8A] to-blue-600 text-white font-bold shadow-sm ${sizeClasses}`}
    >
      {initials}
    </div>
  );
}
