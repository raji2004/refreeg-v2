"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";
import { getCampaignCategoryStyle } from "@/lib/campaign-categories";
import { causePublicPath } from "@/lib/causes/slug";

export type GivingPeriod = "year" | "last-year" | "all";
export type GivingFilter = "all" | "delivered" | "in-progress" | "pledges";
export type GiftStatus = "delivered" | "in-progress" | "pledge";

export type GiftRow = {
  id: string;
  kind: "donation" | "pledge";
  title: string;
  owner: string;
  image: string | null;
  href: string;
  amount: number;
  date: string;
  status: GiftStatus;
  /** Payment reference, for the receipt link; null for pledges. */
  reference: string | null;
};

export type RecurringGift = {
  id: string;
  title: string;
  owner: string;
  amount: number;
  interval: string;
  nextCharge: string;
  since: string;
};

export type GivingOverview = {
  isEmpty: boolean;
  savedCount: number;
  headline: {
    amount: number;
    giftCount: number;
    totalGiftCount: number;
    campaignCount: number;
    deliveredCount: number;
    since: string | null;
  };
  periodTotals: Record<GivingPeriod, number>;
  lastYear: number;
  stats: {
    thisYear: number;
    lastYear: number;
    openPledges: { amount: number; count: number };
    monthly: { amount: number; nextCharge: string | null };
    eiza: number;
  };
  gifts: GiftRow[];
  hasMoreGifts: boolean;
  givenByCause: { category: string; label: string; amount: number }[];
  recurring: RecurringGift[];
};

/** Next charge date for a subscription, counted from its start date. */
function nextChargeDate(start: Date, interval: string, now = new Date()) {
  const next = new Date(start);
  if (interval === "weekly") {
    while (next <= now) next.setDate(next.getDate() + 7);
    return next;
  }
  const day = start.getDate();
  next.setFullYear(now.getFullYear(), now.getMonth(), 1);
  const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay(next.getFullYear(), next.getMonth())));
  if (next <= now) {
    next.setMonth(next.getMonth() + 1, 1);
    next.setDate(Math.min(day, lastDay(next.getFullYear(), next.getMonth())));
  }
  return next;
}

function inPeriod(date: Date, period: GivingPeriod, now: Date) {
  const year = date.getFullYear();
  if (period === "year") return year === now.getFullYear();
  if (period === "last-year") return year === now.getFullYear() - 1;
  return true;
}

export async function getGivingOverview({
  period = "all",
  filter = "all",
  q = "",
  limit = 20,
}: {
  period?: GivingPeriod;
  filter?: GivingFilter;
  q?: string;
  limit?: number;
} = {}): Promise<GivingOverview | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const now = new Date();
  const causeSelect = {
    id: true,
    title: true,
    slug: true,
    image: true,
    category: true,
    user: { select: { fullName: true } },
  } as const;

  const [donations, pledges, subscriptions, savedCount, profile] =
    await Promise.all([
      prisma.donation.findMany({
        where: { userId: user.id, status: "completed" },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          paystack_reference: true,
          cause: { select: causeSelect },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pledges.findMany({
        where: {
          status: "pending",
          OR: [
            { user_id: user.id },
            ...(user.email ? [{ user_id: null, email: user.email }] : []),
          ],
        },
        select: { id: true, amount: true, reminder_date: true, cause_id: true },
        orderBy: { reminder_date: "asc" },
      }),
      prisma.subscriptions.findMany({
        where: { user_id: user.id, status: "active" },
        select: {
          id: true,
          amount: true,
          interval: true,
          created_at: true,
          cause_id: true,
        },
      }),
      prisma.bookmarks.count({ where: { user_id: user.id } }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { total_points: true },
      }),
    ]);

  // Pledges and subscriptions only store a cause id.
  const otherCauseIds = [
    ...new Set(
      [...pledges, ...subscriptions]
        .map((r) => r.cause_id)
        .filter((id): id is string => !!id),
    ),
  ];
  const donatedCauseIds = [...new Set(donations.map((d) => d.cause.id))];

  const [otherCauses, deliveredRows] = await Promise.all([
    otherCauseIds.length
      ? prisma.cause.findMany({
          where: { id: { in: otherCauseIds } },
          select: causeSelect,
        })
      : Promise.resolve([]),
    // A gift counts as delivered once its campaign has an approved proof update.
    donatedCauseIds.length
      ? prisma.campaign_proof_updates.findMany({
          where: { cause_id: { in: donatedCauseIds }, status: "approved" },
          select: { cause_id: true },
          distinct: ["cause_id"],
        })
      : Promise.resolve([]),
  ]);
  const causeById = new Map(otherCauses.map((c) => [c.id, c]));
  const delivered = new Set(deliveredRows.map((r) => r.cause_id));

  const toRow = (
    cause: (typeof otherCauses)[number],
    extra: Omit<GiftRow, "title" | "owner" | "image" | "href">,
  ): GiftRow => ({
    ...extra,
    title: cause.title,
    owner: cause.user?.fullName || "RefreeG campaign",
    image: cause.image,
    href: causePublicPath(cause),
  });

  const donationRows = donations.map((d) =>
    toRow(d.cause, {
      id: d.id,
      kind: "donation",
      amount: Number(d.amount),
      date: (d.createdAt ?? now).toISOString(),
      status: delivered.has(d.cause.id) ? "delivered" : "in-progress",
      reference: d.paystack_reference,
    }),
  );
  const pledgeRows = pledges.flatMap((p) => {
    const cause = causeById.get(p.cause_id);
    if (!cause) return [];
    return [
      toRow(cause, {
        id: p.id,
        kind: "pledge" as const,
        amount: Number(p.amount),
        date: p.reminder_date.toISOString(),
        status: "pledge" as const,
        reference: null,
      }),
    ];
  });

  // Period applies to completed gifts; open pledges are always current.
  const sum = (rows: GiftRow[]) => rows.reduce((t, r) => t + r.amount, 0);
  const periodDonations = donationRows.filter((r) =>
    inPeriod(new Date(r.date), period, now),
  );
  const thisYear = sum(
    donationRows.filter((r) => inPeriod(new Date(r.date), "year", now)),
  );
  const lastYear = sum(
    donationRows.filter((r) => inPeriod(new Date(r.date), "last-year", now)),
  );

  const byFilter: Record<GivingFilter, GiftRow[]> = {
    all: [...pledgeRows, ...periodDonations],
    delivered: periodDonations.filter((r) => r.status === "delivered"),
    "in-progress": periodDonations.filter((r) => r.status === "in-progress"),
    pledges: pledgeRows,
  };
  const needle = q.trim().toLowerCase();
  const matching = byFilter[filter].filter(
    (r) =>
      !needle ||
      r.title.toLowerCase().includes(needle) ||
      r.owner.toLowerCase().includes(needle),
  );

  const categoryTotals = new Map<string, number>();
  for (const d of donations) {
    if (!inPeriod(d.createdAt ?? now, period, now)) continue;
    const id = getCampaignCategoryStyle(d.cause.category).id;
    categoryTotals.set(id, (categoryTotals.get(id) ?? 0) + Number(d.amount));
  }

  const recurring = subscriptions.flatMap((s) => {
    const cause = s.cause_id ? causeById.get(s.cause_id) : undefined;
    if (!cause) return [];
    return [
      {
        id: s.id,
        title: cause.title,
        owner: cause.user?.fullName || "RefreeG campaign",
        amount: Number(s.amount),
        interval: s.interval,
        nextCharge: nextChargeDate(s.created_at, s.interval, now).toISOString(),
        since: s.created_at.toISOString(),
      },
    ];
  });
  const monthlyPlans = recurring.filter((r) => r.interval === "monthly");
  const nextMonthly = monthlyPlans.map((r) => r.nextCharge).sort()[0];

  const firstGift = donations.at(-1)?.createdAt;
  const headlineRows = byFilter[filter];

  return {
    isEmpty:
      donations.length === 0 &&
      pledges.length === 0 &&
      subscriptions.length === 0,
    savedCount,
    headline: {
      amount: sum(headlineRows),
      giftCount: headlineRows.length,
      totalGiftCount: periodDonations.length + pledgeRows.length,
      campaignCount: new Set(periodDonations.map((r) => r.href)).size,
      deliveredCount: periodDonations.filter((r) => r.status === "delivered")
        .length,
      since: firstGift ? firstGift.toISOString() : null,
    },
    periodTotals: {
      year: thisYear,
      "last-year": lastYear,
      all: sum(donationRows),
    },
    lastYear,
    stats: {
      thisYear,
      lastYear,
      openPledges: {
        amount: sum(pledgeRows),
        count: new Set(pledgeRows.map((r) => r.href)).size,
      },
      monthly: {
        amount: monthlyPlans.reduce((t, r) => t + r.amount, 0),
        nextCharge: nextMonthly ?? null,
      },
      eiza: profile?.total_points ?? 0,
    },
    gifts: matching.slice(0, limit),
    hasMoreGifts: matching.length > limit,
    givenByCause: [...categoryTotals.entries()]
      .map(([category, amount]) => ({
        category,
        label: getCampaignCategoryStyle(category).name,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount),
    recurring,
  };
}
