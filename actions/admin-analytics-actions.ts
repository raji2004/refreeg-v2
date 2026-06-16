"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminOrManager } from "@/lib/auth/admin-auth";
import { subDays, differenceInDays, startOfDay, endOfDay, format } from "date-fns";

export interface AnalyticsData {
  totalDonations: {
    current: string;
    previous: string;
    trend: number;
  };
  totalUsers: {
    current: number;
    newInPeriod: number;
    trend: number;
  };
  activeCauses: {
    active: number;
    total: number;
  };
  pendingApprovals: {
    current: number;
  };
}

export interface DonationTrend {
  period: string;
  regular: number;
  crypto: number;
  total: number;
  count: number;
}

export interface UserGrowth {
  period: string;
  users: number;
  active: number;
}

export interface CauseCategory {
  category: string;
  total: number;
  approved: number;
  pending: number;
  completed: number;
}

export interface KycAnalytics {
  total: number;
  approvalRate: number;
  pending: number;
  avgProcessingTimeHours: number;
}

export interface PaymentAnalytics {
  total: number;
  failureRate: number;
  failedAmount: number;
}

export interface CauseLifecycle {
  funnel: {
    created: number;
    pending: number;
    approved: number;
  };
  avgApprovalTimeHours: number;
}

export interface Alert {
  id: string;
  type: "warning" | "critical";
  message: string;
  metric: string;
  value: string;
  threshold: string;
}

export async function getAdminAnalytics(from?: string, to?: string): Promise<AnalyticsData> {
  await requireAdminOrManager();

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : subDays(toDate, 30);
  const daysDiff = differenceInDays(toDate, fromDate);
  const prevFromDate = subDays(fromDate, daysDiff);

  // Donations
  const [currentDonations, prevDonations] = await Promise.all([
    prisma.donation.aggregate({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
        status: "completed",
      },
      _sum: { amount: true },
    }),
    prisma.donation.aggregate({
      where: {
        createdAt: { gte: prevFromDate, lte: fromDate },
        status: "completed",
      },
      _sum: { amount: true },
    }),
  ]);

  const currentTotal = Number(currentDonations._sum.amount || 0);
  const prevTotal = Number(prevDonations._sum.amount || 0);
  const donationTrend = prevTotal === 0 ? 100 : ((currentTotal - prevTotal) / prevTotal) * 100;

  // Users
  const [totalUsers, newUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: fromDate, lte: toDate } },
    }),
  ]);

  // Causes
  const [activeCauses, totalCauses] = await Promise.all([
    prisma.cause.count({ where: { status: "approved" } }),
    prisma.cause.count(),
  ]);

  // Pending Approvals
  const pendingApprovals = await prisma.cause.count({
    where: { status: "pending" },
  });

  return {
    totalDonations: {
      current: currentTotal.toLocaleString("en-NG", { style: "currency", currency: "NGN" }),
      previous: prevTotal.toLocaleString("en-NG", { style: "currency", currency: "NGN" }),
      trend: Number(donationTrend.toFixed(1)),
    },
    totalUsers: {
      current: totalUsers,
      newInPeriod: newUsers,
      trend: 0, // Simplified
    },
    activeCauses: {
      active: activeCauses,
      total: totalCauses,
    },
    pendingApprovals: {
      current: pendingApprovals,
    },
  };
}

export async function getDonationTrends(from?: string, to?: string): Promise<DonationTrend[]> {
  await requireAdminOrManager();

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : subDays(toDate, 30);

  // Group by day for the last 30 days
  const donations = await prisma.donation.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: "completed",
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  const cryptoDonations = await prisma.crypto_donations.findMany({
    where: {
      created_at: { gte: fromDate, lte: toDate },
      status: "completed",
    },
    select: {
      amount_in_naira: true,
      created_at: true,
    },
  });

  const trendsMap = new Map<string, DonationTrend>();

  // Initialize days
  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const day = format(d, "MMM dd");
    trendsMap.set(day, { period: day, regular: 0, crypto: 0, total: 0, count: 0 });
  }

  donations.forEach((d) => {
    if (!d.createdAt) return;
    const day = format(d.createdAt, "MMM dd");
    const trend = trendsMap.get(day);
    if (trend) {
      const amt = Number(d.amount);
      trend.regular += amt;
      trend.total += amt;
      trend.count += 1;
    }
  });

  cryptoDonations.forEach((d) => {
    if (!d.created_at) return;
    const day = format(d.created_at, "MMM dd");
    const trend = trendsMap.get(day);
    if (trend) {
      const amt = Number(d.amount_in_naira);
      trend.crypto += amt;
      trend.total += amt;
      trend.count += 1;
    }
  });

  return Array.from(trendsMap.values());
}

export async function getUserGrowth(from?: string, to?: string): Promise<UserGrowth[]> {
  await requireAdminOrManager();

  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : subDays(toDate, 30);

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: fromDate, lte: toDate } },
    select: { createdAt: true },
  });

  const growthMap = new Map<string, UserGrowth>();

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const day = format(d, "MMM dd");
    growthMap.set(day, { period: day, users: 0, active: 0 });
  }

  users.forEach((u) => {
    if (!u.createdAt) return;
    const day = format(u.createdAt, "MMM dd");
    const growth = growthMap.get(day);
    if (growth) {
      growth.users += 1;
      growth.active += 1; // Simplified
    }
  });

  return Array.from(growthMap.values());
}

export async function getCauseCategories(): Promise<CauseCategory[]> {
  await requireAdminOrManager();

  const categories = await prisma.cause.groupBy({
    by: ["category"],
    _count: { _all: true },
  });

  const results: CauseCategory[] = [];

  for (const cat of categories) {
    const [approved, pending, completed] = await Promise.all([
      prisma.cause.count({ where: { category: cat.category, status: "approved" } }),
      prisma.cause.count({ where: { category: cat.category, status: "pending" } }),
      prisma.cause.count({ where: { category: cat.category, status: "completed" } }),
    ]);

    results.push({
      category: cat.category,
      total: cat._count._all,
      approved,
      pending,
      completed,
    });
  }

  return results;
}

export async function getKycAnalytics(from?: string, to?: string): Promise<KycAnalytics> {
  await requireAdminOrManager();

  const [total, pending, approved] = await Promise.all([
    prisma.kyc_verifications.count(),
    prisma.kyc_verifications.count({ where: { status: "pending" } }),
    prisma.kyc_verifications.count({ where: { status: "approved" } }),
  ]);

  return {
    total,
    pending,
    approvalRate: total > 0 ? (approved / total) * 100 : 0,
    avgProcessingTimeHours: 24, // Mocked
  };
}

export async function getPaymentAnalytics(from?: string, to?: string): Promise<PaymentAnalytics> {
  await requireAdminOrManager();

  const [total, failed] = await Promise.all([
    prisma.donation.count(),
    prisma.donation.count({ where: { status: "failed" } }),
  ]);

  const failedAgg = await prisma.donation.aggregate({
    where: { status: "failed" },
    _sum: { amount: true },
  });

  return {
    total,
    failureRate: total > 0 ? (failed / total) * 100 : 0,
    failedAmount: Number(failedAgg._sum.amount || 0),
  };
}

export async function getCauseLifecycleAnalytics(from?: string, to?: string): Promise<CauseLifecycle> {
  await requireAdminOrManager();

  const [created, pending, approved] = await Promise.all([
    prisma.cause.count(),
    prisma.cause.count({ where: { status: "pending" } }),
    prisma.cause.count({ where: { status: "approved" } }),
  ]);

  return {
    funnel: {
      created,
      pending,
      approved,
    },
    avgApprovalTimeHours: 12, // Mocked
  };
}

export async function getAlerts(): Promise<Alert[]> {
  await requireAdminOrManager();

  const pendingCount = await prisma.cause.count({ where: { status: "pending" } });
  const alerts: Alert[] = [];

  if (pendingCount > 10) {
    alerts.push({
      id: "pending-causes",
      type: "warning",
      message: "High volume of pending causes",
      metric: "Pending Causes",
      value: String(pendingCount),
      threshold: "10",
    });
  }

  return alerts;
}

export async function getApiCampaigns(search?: string) {
  await requireAdminOrManager();

  const where = search
    ? {
        OR: [{ title: { contains: search, mode: "insensitive" as const } }],
      }
    : {};

  const campaigns = await prisma.api_campaigns.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 50,
  });

  const apiKeyIds = [
    ...new Set(campaigns.map((c) => c.api_key_id).filter(Boolean)),
  ];

  let apiKeys: Record<string, any> = {};
  if (apiKeyIds.length > 0) {
    const keys = await prisma.api_keys.findMany({
      where: { id: { in: apiKeyIds as string[] } },
      select: { id: true, name: true, key_prefix: true, mode: true },
    });
    apiKeys = Object.fromEntries(keys.map((k) => [k.id, k]));
  }

  const allCampaigns = await prisma.api_campaigns.findMany({
    select: { api_key_id: true },
  });

  const allApiKeys = await prisma.api_keys.findMany({
    select: { id: true, key_prefix: true, mode: true },
  });
  const keyMap = Object.fromEntries(allApiKeys.map((k) => [k.id, k]));

  const uniqueApis = new Set(
    allCampaigns
      .map((c) => keyMap[c.api_key_id as string]?.key_prefix)
      .filter(Boolean),
  ).size;

  const liveCount = allCampaigns.filter(
    (c) => keyMap[c.api_key_id as string]?.mode === "live",
  ).length;
  const testCount = allCampaigns.filter(
    (c) => keyMap[c.api_key_id as string]?.mode === "test",
  ).length;

  return {
    campaigns: campaigns.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      created_at: c.created_at,
      api_key_id: c.api_key_id,
      apiName: apiKeys[c.api_key_id as string]?.name || "Unknown API",
      apiPrefix: apiKeys[c.api_key_id as string]?.key_prefix || "N/A",
      apiMode: apiKeys[c.api_key_id as string]?.mode || "unknown",
    })),
    stats: {
      total: allCampaigns.length,
      uniqueApis,
      liveCount,
      testCount,
    },
  };
}
