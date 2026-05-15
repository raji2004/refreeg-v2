"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  HeartHandshake,
  MessageCircle,
  Share2,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { useEventListeners } from "@/hooks/use-event-listeners";
import { useAuth } from "@/hooks/use-auth";
import { getUserWallet, getUserStats } from "@/actions/event-reward-actions";
import { trackLogin } from "@/actions/auth-actions";
import {
  EIZA_MONTHLY_ACTIVE_DAYS,
  EIZA_REWARD_RULES,
  type RewardEventType,
} from "@/lib/reward-constants";
import Link from "next/link";
import type { RewardTransaction, UserStreak } from "@/types";

type RewardsTab = "overview" | "transactions" | "rules";

interface Transaction {
  label: string;
  time: string;
  amount: number;
  id: string;
  type: string;
  status: string;
  createdAt: string;
}

const DAILY_CAP_TYPES: RewardEventType[] = [
  "comment",
  "like_comment",
  "share",
  "login",
];

const DAILY_REWARD_CAP = DAILY_CAP_TYPES.reduce((total, type) => {
  return total + (EIZA_REWARD_RULES[type].dailyCap ?? 0);
}, 0);

const EARN_ACTIONS = [
  {
    type: "comment" as RewardEventType,
    icon: MessageCircle,
    label: "Comment",
    rate: "+2 EIZA",
    detail: "1 min cooldown",
  },
  {
    type: "share" as RewardEventType,
    icon: Share2,
    label: "Share",
    rate: "+10 EIZA",
    detail: "100 daily cap",
  },
  {
    type: "donation" as RewardEventType,
    icon: HeartHandshake,
    label: "Donate",
    rate: "+5%",
    detail: "Uncapped",
  },
  {
    type: "login" as RewardEventType,
    icon: CalendarCheck,
    label: "Daily login",
    rate: "+1 EIZA",
    detail: "24 hr cooldown",
  },
];

const RULE_ROWS = [
  ["Comment", "+2 EIZA", "1 min", "50 EIZA"],
  ["Like comment", "+0.5 EIZA", "10 sec", "25 EIZA"],
  ["Share campaign", "+10 EIZA", "5 min", "100 EIZA"],
  ["Donate", "5% value", "None", "Uncapped"],
  ["Daily login", "+1 EIZA", "24 hrs", "1 EIZA"],
  ["Weekly streak", "+25 EIZA", "7 days", "25 EIZA"],
  ["Monthly active", "+100 EIZA", "30 days", "100 EIZA"],
];

export default function EizaRewardsScreen() {
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<RewardsTab>("overview");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<UserStreak | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();

  const streakSeries = useMemo(() => buildStreakSeries(stats), [stats]);
  const streakPath = useMemo(() => buildStreakPath(streakSeries), [streakSeries]);

  const fetchWalletData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const walletData = await getUserWallet(user.id);
      if (walletData.wallet) {
        setBalance(walletData.wallet.balance || 0);
      }

      if (walletData.transactions && Array.isArray(walletData.transactions)) {
        const formatted = walletData.transactions.map((t: RewardTransaction) => ({
          id: t.id,
          label: formatTransactionLabel(t.transaction_type),
          time: formatTime(t.created_at),
          amount: t.amount,
          type: t.transaction_type,
          status: t.status,
          createdAt: t.created_at,
        }));
        setTransactions(formatted);
      }

      const userStats = await getUserStats(user.id);
      setStats(userStats);
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleLoginReward = useCallback(async () => {
    if (!user?.id) return;

    const now = Date.now();
    const storageKey = `eiza_daily_login_reward_${user.id}`;

    try {
      const lastRewardMs = window.localStorage.getItem(storageKey);
      if (lastRewardMs && now - Number(lastRewardMs) < 24 * 60 * 60 * 1000) {
        return;
      }

      await trackLogin(user.id);
      window.localStorage.setItem(storageKey, String(now));
      await fetchWalletData();
    } catch (error) {
      console.error("Error handling daily login reward:", error);
    }
  }, [user?.id, fetchWalletData]);

  useEventListeners({
    userId: user?.id,
    onComment: fetchWalletData,
    onLikeComment: fetchWalletData,
    onShare: fetchWalletData,
    onDonation: fetchWalletData,
    onWeeklyStreak: fetchWalletData,
    onMonthlyActive: fetchWalletData,
  });

  useEffect(() => {
    if (!authLoading) {
      fetchWalletData();
    }
  }, [authLoading, fetchWalletData]);

  useEffect(() => {
    if (!authLoading && user?.id) {
      handleLoginReward();
    }
  }, [authLoading, user?.id, handleLoginReward]);

  const visibleBalance = useMemo(
    () => (showBalance ? `${formatEiza(balance)} EIZA` : "••••• EIZA"),
    [showBalance, balance],
  );

  const todayTransactions = useMemo(
    () => transactions.filter((transaction) => isToday(transaction.createdAt)),
    [transactions],
  );

  const todayEarned = useMemo(
    () => todayTransactions.reduce((total, item) => total + item.amount, 0),
    [todayTransactions],
  );

  const dailyCapEarned = useMemo(
    () =>
      todayTransactions.reduce((total, item) => {
        return DAILY_CAP_TYPES.includes(item.type as RewardEventType)
          ? total + item.amount
          : total;
      }, 0),
    [todayTransactions],
  );

  const dailyCapPercent = getPercent(dailyCapEarned, DAILY_REWARD_CAP);
  const monthlyActiveDays = Math.min(
    stats?.active_days_this_month ?? 0,
    EIZA_MONTHLY_ACTIVE_DAYS,
  );
  const monthlyActivePercent = getPercent(
    monthlyActiveDays,
    EIZA_MONTHLY_ACTIVE_DAYS,
  );
  const qualityMultiplier = stats?.quality_multiplier ?? 1;
  const latestTransactions = transactions.slice(0, 5);
  const displayedTransactions =
    activeTab === "transactions" ? transactions : latestTransactions;

  return (
    <div className="relative min-h-[calc(100vh-84px)] bg-[#f4f6fa] px-4 pb-10 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-sm font-medium text-slate-500">EIZA Rewards</p>
              <h1 className="text-2xl font-semibold text-slate-950">
                Wallet dashboard
              </h1>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={16} />
            Active today
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <section className="overflow-hidden rounded-2xl bg-blue-600 text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]">
            <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-100">
                    Available balance
                  </p>
                  <p className="mt-2 text-4xl font-semibold tracking-normal sm:text-5xl">
                    {visibleBalance}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBalance((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Toggle balance visibility"
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <BalanceMetric
                  label="Today earned"
                  value={`${formatEiza(todayEarned)} EIZA`}
                />
                <BalanceMetric
                  label="Daily cap used"
                  value={`${formatEiza(dailyCapEarned)} / ${formatEiza(DAILY_REWARD_CAP)}`}
                />
                <BalanceMetric
                  label="Quality multiplier"
                  value={`${formatMultiplier(qualityMultiplier)}x`}
                />
              </div>

              <div className="mt-5 rounded-xl bg-white/15 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-blue-100">7-day streak</span>
                  <span className="font-semibold text-emerald-100">
                    {stats?.weekly_streak || 0} day streak
                  </span>
                </div>
                <svg className="mt-3 h-9 w-full" viewBox="0 0 240 36" fill="none">
                  <path
                    d={streakPath}
                    stroke="rgba(219,234,254,0.95)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {streakSeries.map((point, index) => {
                    const x = index * 40;
                    const y = point > 0 ? 9 : 27;

                    return (
                      <circle
                        key={`streak-point-${index}`}
                        cx={x}
                        cy={y}
                        r="3"
                        fill={
                          point > 0
                            ? "rgba(16,185,129,0.95)"
                            : "rgba(226,232,240,0.9)"
                        }
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Earn EIZA</p>
                <h2 className="text-lg font-semibold text-slate-950">
                  Reward actions
                </h2>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Trophy size={18} />
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {EARN_ACTIONS.map((action) => {
                const Icon = action.icon;

                return (
                  <div
                    key={action.type}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {action.label}
                        </p>
                        <p className="text-xs text-slate-500">{action.detail}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-emerald-600">
                      {action.rate}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <ProgressPanel
            icon={Gauge}
            label="Daily cap"
            value={`${Math.round(dailyCapPercent)}%`}
            progress={dailyCapPercent}
            detail={`${formatEiza(dailyCapEarned)} of ${formatEiza(DAILY_REWARD_CAP)} EIZA`}
          />
          <ProgressPanel
            icon={Flame}
            label="Monthly active"
            value={`${monthlyActiveDays}/${EIZA_MONTHLY_ACTIVE_DAYS}`}
            progress={monthlyActivePercent}
            detail="Login days this month"
          />
          <ProgressPanel
            icon={ShieldCheck}
            label="Multiplier"
            value={`${formatMultiplier(qualityMultiplier)}x`}
            progress={Math.min(100, (qualityMultiplier / 2) * 100)}
            detail="Quality score tier"
          />
          <ProgressPanel
            icon={ArrowDownLeft}
            label="Transactions"
            value={String(transactions.length)}
            progress={Math.min(100, transactions.length * 10)}
            detail={loading ? "Syncing wallet" : "Completed rewards"}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["overview", "transactions", "rules"] as RewardsTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
              <h2 className="text-base font-semibold text-slate-950">
                Reward progress
              </h2>
              <div className="mt-5 space-y-5">
                <LabeledProgress
                  label="Daily capped rewards"
                  value={`${formatEiza(dailyCapEarned)} / ${formatEiza(DAILY_REWARD_CAP)} EIZA`}
                  progress={dailyCapPercent}
                />
                <LabeledProgress
                  label="Monthly active bonus"
                  value={`${monthlyActiveDays} / ${EIZA_MONTHLY_ACTIVE_DAYS} days`}
                  progress={monthlyActivePercent}
                />
              </div>
            </section>

            <TransactionsPanel
              title="Latest transactions"
              loading={loading}
              transactions={latestTransactions}
              emptyLabel="No transactions yet."
            />
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="mt-4">
            <TransactionsPanel
              title="Transactions"
              loading={loading}
              transactions={displayedTransactions}
              emptyLabel="No transactions yet."
            />
          </div>
        )}

        {activeTab === "rules" && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-950">
                Reward rules
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Action</th>
                    <th className="px-5 py-3">Reward</th>
                    <th className="px-5 py-3">Cooldown</th>
                    <th className="px-5 py-3">Cap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {RULE_ROWS.map((row) => (
                    <tr key={row[0]} className="hover:bg-slate-50">
                      {row.map((cell) => (
                        <td key={cell} className="px-5 py-4">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function BalanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-3">
      <p className="text-xs font-medium text-blue-100">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ProgressPanel({
  icon: Icon,
  label,
  value,
  progress,
  detail,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  progress: number;
  detail: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </section>
  );
}

function LabeledProgress({
  label,
  value,
  progress,
}: {
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-950">{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

function TransactionsPanel({
  title,
  loading,
  transactions,
  emptyLabel,
}: {
  title: string;
  loading: boolean;
  transactions: Transaction[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <span className="text-sm font-medium text-slate-500">
          {transactions.length} shown
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {transactions.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            {loading ? "Loading transactions..." : emptyLabel}
          </div>
        ) : (
          transactions.map((item) => (
            <TransactionRow key={item.id} transaction={item} />
          ))
        )}
      </div>
    </section>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const statusTone =
    transaction.status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <ArrowDownLeft size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {transaction.label}
          </p>
          <p className="text-xs text-slate-500">
            {transaction.time} · {formatTransactionType(transaction.type)}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone}`}
        >
          {transaction.status}
        </span>
        <span className="min-w-20 text-right text-sm font-semibold text-emerald-600">
          +{formatEiza(transaction.amount)}
        </span>
      </div>
    </div>
  );
}

function buildStreakSeries(stats: UserStreak | null): number[] {
  const series = new Array(7).fill(0);
  const streak = stats?.weekly_streak || 0;
  const lastActiveDate = stats?.last_active_date;

  if (!streak || !lastActiveDate) return series;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = new Date(lastActiveDate);
  lastActive.setHours(0, 0, 0, 0);

  const dayMs = 24 * 60 * 60 * 1000;
  const daysSinceLastActive = Math.max(
    0,
    Math.floor((today.getTime() - lastActive.getTime()) / dayMs),
  );

  const endIndex = 6 - daysSinceLastActive;
  const visibleStreak = Math.min(streak, 7);

  for (let i = 0; i < visibleStreak; i += 1) {
    const idx = endIndex - i;
    if (idx < 0 || idx > 6) continue;
    series[idx] = 1;
  }

  return series;
}

function buildStreakPath(series: number[]): string {
  const points = series.map((point, index) => {
    const x = index * 40;
    const y = point > 0 ? 9 : 27;
    return `${x} ${y}`;
  });

  if (points.length === 0) return "M0 27";

  return `M${points[0]} L${points.slice(1).join(" L")}`;
}

function formatTransactionLabel(type: string): string {
  const labels: Record<string, string> = {
    signup: "One time signup bonus",
    comment: "Comment reward",
    like_comment: "Comment like reward",
    share: "Campaign share reward",
    donation: "Donation bonus",
    login: "Daily login bonus",
    weekly_streak: "Weekly streak reward",
    monthly_active: "Monthly active bonus",
  };
  return labels[type] || "Reward earned";
}

function formatTransactionType(type: string): string {
  return type.replace(/_/g, " ");
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function isToday(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function formatEiza(amount: number) {
  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatMultiplier(multiplier: number) {
  return multiplier.toLocaleString("en-US", {
    minimumFractionDigits: multiplier % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}
