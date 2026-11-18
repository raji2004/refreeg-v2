import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  formatChange,
  formatCount,
  formatNaira,
  formatPercent,
  formatPoints,
  initials,
} from "@/lib/admin-workspace";
import {
  bucketKeyFromLocal,
  dayLabel,
  getReportingWindow,
  lagosToday,
  recentDays,
  recentMonths,
  type BucketUnit,
  type ReportingWindow,
} from "./period";
import type {
  Metric,
  Period,
  Segment,
  Tone,
  WorkspaceData,
} from "@/components/admin/workspace/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const LAGOS = "Africa/Lagos";
const CACHE_SECONDS = 120;

// Completed fiat and crypto gifts in [from, to), normalised to naira.
function gifts(from: Date, to: Date) {
  return Prisma.sql`
    SELECT created_at, amount::float8 AS amount, cause_id,
      COALESCE(user_id::text, lower(email)) AS donor
    FROM donations
    WHERE status = 'completed' AND created_at >= ${from} AND created_at < ${to}
    UNION ALL
    SELECT created_at, amount_in_naira::float8, cause_id,
      COALESCE(user_id::text, donor_wallet_address, id::text)
    FROM crypto_donations
    WHERE status = 'completed' AND created_at >= ${from} AND created_at < ${to}`;
}

const displayName = Prisma.sql`COALESCE(
  NULLIF(trim(p.display_name), ''),
  NULLIF(trim(p.full_name), ''),
  NULLIF(trim(concat(p.first_name, ' ', p.last_name)), ''),
  p.username,
  'Unknown user')`;

type Bucketed = { bucket: Date; total: number };

function fill(rows: Bucketed[], unit: BucketUnit, keys: string[]): number[] {
  const map = new Map(
    rows.map((row) => [bucketKeyFromLocal(unit, row.bucket), row.total]),
  );
  return keys.map((key) => (key ? (map.get(key) ?? 0) : 0));
}

/** Current and previous totals from a single scan of both windows. */
async function giftTotals(w: ReportingWindow) {
  const [row] = await prisma.$queryRaw<
    {
      total: number;
      gifts: number;
      donors: number;
      prev_total: number;
      prev_donors: number;
    }[]
  >`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE created_at >= ${w.from}), 0)::float8 AS total,
      COUNT(*) FILTER (WHERE created_at >= ${w.from})::int AS gifts,
      COUNT(DISTINCT donor) FILTER (WHERE created_at >= ${w.from})::int AS donors,
      COALESCE(SUM(amount) FILTER (WHERE created_at < ${w.previousTo}), 0)::float8 AS prev_total,
      COUNT(DISTINCT donor) FILTER (WHERE created_at < ${w.previousTo})::int AS prev_donors
    FROM (${gifts(w.previousFrom, w.to)}) g
    WHERE created_at >= ${w.from} OR created_at < ${w.previousTo}`;
  return row;
}

/** Current and comparison chart buckets from a single scan. */
async function giftSeries(w: ReportingWindow) {
  // The day view has no comparison line, so skip last week's buckets.
  const scanFrom = w.period === "day" ? w.from : w.previousFrom;
  const rows = await prisma.$queryRaw<Bucketed[]>`
    SELECT date_trunc(${w.unit}, created_at AT TIME ZONE ${LAGOS}) AS bucket,
      SUM(amount)::float8 AS total
    FROM (${gifts(scanFrom, w.to)}) g
    WHERE created_at >= ${w.from} OR created_at < ${w.previousChartTo}
    GROUP BY 1`;
  return {
    values: fill(rows, w.unit, w.buckets),
    previous: fill(rows, w.unit, w.previousBuckets),
  };
}

/** Every scalar count the page needs, in one round trip. */
async function counts(w: ReportingWindow) {
  const due = lagosToday();
  const [row] = await prisma.$queryRaw<
    {
      new_users: number;
      prev_new_users: number;
      pledges: number;
      pledges_fulfilled: number;
      prev_pledges: number;
      prev_pledges_fulfilled: number;
      due: number;
      due_paid: number;
      funded: number;
      approved: number;
      pending_causes: number;
      pending_kyc: number;
      pending_petitions: number;
    }[]
  >`
    SELECT
      u.new_users, u.prev_new_users,
      pl.pledges, pl.pledges_fulfilled, pl.prev_pledges, pl.prev_pledges_fulfilled,
      d.due, d.due_paid, c.funded, c.approved,
      (SELECT COUNT(*) FROM causes WHERE status = 'pending')::int AS pending_causes,
      (SELECT COUNT(*) FROM kyc_verifications WHERE status = 'pending')::int AS pending_kyc,
      (SELECT COUNT(*) FROM petitions WHERE status = 'pending')::int AS pending_petitions
    FROM
      (SELECT
        COUNT(*) FILTER (WHERE created_at >= ${w.from})::int AS new_users,
        COUNT(*) FILTER (WHERE created_at < ${w.previousTo})::int AS prev_new_users
      FROM profiles
      WHERE created_at >= ${w.previousFrom} AND created_at < ${w.to}
        AND (created_at >= ${w.from} OR created_at < ${w.previousTo})) u,
      (SELECT
        COUNT(*) FILTER (WHERE created_at >= ${w.from})::int AS pledges,
        COUNT(*) FILTER (WHERE created_at >= ${w.from} AND status = 'fulfilled')::int AS pledges_fulfilled,
        COUNT(*) FILTER (WHERE created_at < ${w.previousTo})::int AS prev_pledges,
        COUNT(*) FILTER (WHERE created_at < ${w.previousTo} AND status = 'fulfilled')::int AS prev_pledges_fulfilled
      FROM pledges
      WHERE created_at >= ${w.previousFrom} AND created_at < ${w.to}) pl,
      (SELECT COUNT(*)::int AS due,
        COUNT(*) FILTER (WHERE status = 'fulfilled')::int AS due_paid
      FROM pledges WHERE reminder_date = ${due}::date) d,
      (SELECT COUNT(*) FILTER (WHERE raised >= goal)::int AS funded,
        COUNT(*)::int AS approved
      FROM causes WHERE status = 'approved'
        AND created_at >= ${w.from} AND created_at < ${w.to}) c`;
  return row;
}

async function campaignStatus() {
  const since = new Date(Date.now() - 21 * DAY_MS);
  // EXISTS probes the (cause_id, created_at) indexes per live cause instead of
  // aggregating the whole donations history.
  const [row] = await prisma.$queryRaw<
    { active: number; inactive: number; paused: number }[]
  >`
    WITH live AS (
      SELECT c.id, (c.paused OR c.compliance_paused) AS paused,
        c.created_at >= ${since}
        OR EXISTS (SELECT 1 FROM donations d WHERE d.cause_id = c.id
          AND d.status = 'completed' AND d.created_at >= ${since})
        OR EXISTS (SELECT 1 FROM crypto_donations x WHERE x.cause_id = c.id
          AND x.status = 'completed' AND x.created_at >= ${since}) AS recent
      FROM causes c
      WHERE c.status = 'approved' AND (c.end_date IS NULL OR c.end_date > now())
    )
    SELECT
      COUNT(*) FILTER (WHERE NOT paused AND recent)::int AS active,
      COUNT(*) FILTER (WHERE NOT paused AND NOT recent)::int AS inactive,
      COUNT(*) FILTER (WHERE paused)::int AS paused
    FROM live`;
  return row;
}

async function topCampaigns(w: ReportingWindow) {
  const days = recentDays(7);
  // One scan covers both the window ranking and each cause's 7-day trend.
  const scanFrom = new Date(
    Math.min(w.from.getTime(), days[0].start.getTime()),
  );
  const rows = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      owner: string;
      status: string | null;
      total: number;
      donors: number;
      gifts: number;
      trend: { bucket: string; total: number }[];
    }[]
  >`
    WITH g AS (SELECT * FROM (${gifts(scanFrom, w.to)}) x),
    top AS (
      SELECT cause_id, SUM(amount)::float8 AS total,
        COUNT(DISTINCT donor)::int AS donors, COUNT(*)::int AS gifts
      FROM g WHERE created_at >= ${w.from}
      GROUP BY 1 ORDER BY total DESC LIMIT 3
    ),
    trend AS (
      SELECT g.cause_id,
        to_char(date_trunc('day', g.created_at AT TIME ZONE ${LAGOS}), 'YYYY-MM-DD') AS bucket,
        SUM(g.amount)::float8 AS total
      FROM g JOIN top USING (cause_id)
      WHERE g.created_at >= ${days[0].start}
      GROUP BY 1, 2
    )
    SELECT top.cause_id::text AS id, c.title, ${displayName} AS owner, c.status,
      top.total, top.donors, top.gifts,
      COALESCE((SELECT json_agg(json_build_object('bucket', t.bucket, 'total', t.total))
        FROM trend t WHERE t.cause_id = top.cause_id), '[]'::json) AS trend
    FROM top
    JOIN causes c ON c.id = top.cause_id
    LEFT JOIN profiles p ON p.id = c.user_id
    ORDER BY top.total DESC`;

  return rows.map((row, i) => {
    const trend = new Map(row.trend.map((t) => [t.bucket, t.total]));
    return {
      item: {
        id: row.id,
        name: row.title,
        detail: row.owner,
        initials: initials(row.title),
        status: row.status ?? "unknown",
        avatar: (["gold", "neutral", "green"] as Tone[])[i],
        href: `/causes/${row.id}`,
      },
      given: formatNaira(row.total),
      donors: row.donors,
      averageGift: formatNaira(row.gifts ? row.total / row.gifts : 0),
      trend: days.map((d) => trend.get(d.key) ?? 0),
    };
  });
}

const EIZA_SOURCES: Record<string, string> = {
  donation: "Donations",
  comment: "Comments",
  share: "Shares",
  login: "Check-ins & streaks",
  weekly_streak: "Check-ins & streaks",
  monthly_active: "Check-ins & streaks",
  referral_bonus: "Referrals",
  signup: "Sign-up bonus",
};

async function eizaIssued(w: ReportingWindow) {
  const groups = await prisma.rewardTransaction.groupBy({
    by: ["transactionType"],
    where: {
      createdAt: { gte: w.from, lt: w.to },
      status: "completed",
      amount: { gt: 0 },
    },
    _sum: { amount: true },
  });
  const totals = new Map<string, number>();
  for (const group of groups) {
    const label = EIZA_SOURCES[group.transactionType] ?? "Other";
    totals.set(
      label,
      (totals.get(label) ?? 0) + Number(group._sum.amount ?? 0),
    );
  }
  const total = [...totals.values()].reduce((s, v) => s + v, 0);
  const segments: Segment[] = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label,
      value,
      display: formatCount(value, { short: true }),
    }));
  return { segments, total };
}

async function ambassadors(w: ReportingWindow) {
  const months = recentMonths(6);
  const scanFrom = new Date(
    Math.min(w.from.getTime(), months[0].start.getTime()),
  );
  // Attributed gifts are scanned once for the window totals, the overall
  // ambassador-driven total and the six-month trend lines.
  const rows = await prisma.$queryRaw<
    {
      id: string | null;
      name: string | null;
      region: string | null;
      invited: number;
      registered: number;
      driven: number;
      rewards: number;
      all_driven: number;
      trend: { bucket: string; total: number }[] | null;
    }[]
  >`
    WITH attributed AS (
      SELECT a.referrer_id, d.created_at, d.amount::float8 AS amount
      FROM donor_referral_attributions a
      JOIN donations d ON d.id = a.donation_id
      WHERE a.status = 'confirmed' AND d.status = 'completed'
        AND d.created_at >= ${scanFrom} AND d.created_at < ${w.to}
    ), driven AS (
      SELECT referrer_id AS id, SUM(amount)::float8 AS total
      FROM attributed WHERE created_at >= ${w.from} GROUP BY 1
    ), refs AS (
      SELECT referrer_id_v1 AS id, COUNT(*)::int AS invited,
        COUNT(*) FILTER (WHERE registered_v1)::int AS registered
      FROM referrals_v1
      WHERE referrer_id_v1 IS NOT NULL
        AND created_at_v1 >= ${w.from} AND created_at_v1 < ${w.to}
      GROUP BY 1
    ), ranked AS (
      SELECT ids.id, COALESCE(dr.total, 0)::float8 AS driven,
        COALESCE(r.invited, 0) AS invited, COALESCE(r.registered, 0) AS registered
      FROM (SELECT id FROM driven UNION SELECT id FROM refs) ids
      LEFT JOIN driven dr ON dr.id = ids.id
      LEFT JOIN refs r ON r.id = ids.id
      ORDER BY driven DESC, invited DESC LIMIT 50
    ), rewards AS (
      SELECT user_id AS id, SUM(amount)::float8 AS total
      FROM reward_transactions
      WHERE transaction_type = 'referral_bonus' AND status = 'completed'
        AND created_at >= ${w.from} AND created_at < ${w.to}
        AND user_id IN (SELECT id FROM ranked)
      GROUP BY 1
    ), trend AS (
      SELECT referrer_id AS id,
        to_char(date_trunc('month', created_at AT TIME ZONE ${LAGOS}), 'YYYY-MM') AS bucket,
        SUM(amount)::float8 AS total
      FROM attributed
      WHERE created_at >= ${months[0].start}
        AND referrer_id IN (SELECT id FROM ranked)
      GROUP BY 1, 2
    ), totals AS (
      SELECT COALESCE(SUM(total), 0)::float8 AS all_driven FROM driven
    )
    SELECT ranked.id::text AS id, ${displayName} AS name, p.location AS region,
      ranked.invited, ranked.registered, ranked.driven,
      COALESCE(rw.total, 0)::float8 AS rewards, totals.all_driven,
      (SELECT json_agg(json_build_object('bucket', t.bucket, 'total', t.total))
        FROM trend t WHERE t.id = ranked.id) AS trend
    FROM totals
    LEFT JOIN ranked ON true
    LEFT JOIN profiles p ON p.id = ranked.id
    LEFT JOIN rewards rw ON rw.id = ranked.id
    ORDER BY ranked.driven DESC NULLS LAST, ranked.invited DESC NULLS LAST`;

  const allDriven = rows[0]?.all_driven ?? 0;
  const team = rows
    .filter((row) => row.id)
    .map((row) => {
      const name = row.name ?? "Unknown user";
      const trend = new Map((row.trend ?? []).map((t) => [t.bucket, t.total]));
      return {
        id: row.id as string,
        name,
        initials: initials(name),
        region: row.region?.trim() || "Unknown",
        referrals: row.invited,
        signupRate: row.invited
          ? formatPercent(row.registered / row.invited)
          : "—",
        donations: formatNaira(row.driven),
        donationsValue: row.driven,
        rewards: `${formatCount(row.rewards)} EIZA`,
        trend: months.map((m) => trend.get(m.key) ?? 0),
      };
    });
  return { team, allDriven };
}

async function usersPanel() {
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * DAY_MS);
  const d60 = new Date(now.getTime() - 60 * DAY_MS);
  const months = recentMonths(12);
  const [[active], monthly] = await Promise.all([
    prisma.$queryRaw<
      { current: number; previous: number; joined: number; retained: number }[]
    >`
      SELECT
        COUNT(DISTINCT user_id) FILTER (WHERE created_at >= ${d30})::int AS current,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at < ${d30})::int AS previous,
        (SELECT COUNT(*) FROM profiles
          WHERE created_at >= ${d60} AND created_at < ${d30})::int AS joined,
        (SELECT COUNT(*) FROM profiles p
          WHERE p.created_at >= ${d60} AND p.created_at < ${d30}
            AND EXISTS (SELECT 1 FROM events e
              WHERE e.user_id = p.id AND e.created_at >= ${d30}))::int AS retained
      FROM events WHERE created_at >= ${d60}`,
    prisma.$queryRaw<Bucketed[]>`
      SELECT date_trunc('month', created_at AT TIME ZONE ${LAGOS}) AS bucket,
        COUNT(DISTINCT user_id)::float8 AS total
      FROM events WHERE created_at >= ${months[0].start} GROUP BY 1`,
  ]);
  const change = formatChange(active.current, active.previous);
  return {
    monthlyActive: formatCount(active.current),
    change: change ? `${change.text} vs previous 30 days` : "No prior activity",
    retention: active.joined
      ? formatPercent(active.retained / active.joined)
      : "—",
    trend: fill(
      monthly,
      "month",
      months.map((m) => m.key),
    ),
  };
}

async function userActivity(w: ReportingWindow) {
  const days = w.period === "day" ? recentDays(14) : null;
  const unit: BucketUnit = w.period === "year" ? "month" : "day";
  const keys = days ? days.map((d) => d.key) : w.buckets;
  const from = days ? days[0].start : w.from;
  const rows = await prisma.$queryRaw<
    { bucket: Date; returning: number; joined: number }[]
  >`
    WITH r AS (
      SELECT date_trunc(${unit}, e.created_at AT TIME ZONE ${LAGOS}) AS bucket,
        COUNT(DISTINCT e.user_id) FILTER (WHERE p.created_at <
          date_trunc(${unit}, e.created_at AT TIME ZONE ${LAGOS}) AT TIME ZONE ${LAGOS}
        )::float8 AS returning
      FROM events e JOIN profiles p ON p.id = e.user_id
      WHERE e.created_at >= ${from} GROUP BY 1
    ), n AS (
      SELECT date_trunc(${unit}, created_at AT TIME ZONE ${LAGOS}) AS bucket,
        COUNT(*)::float8 AS joined
      FROM profiles WHERE created_at >= ${from} GROUP BY 1
    )
    SELECT COALESCE(r.bucket, n.bucket) AS bucket,
      COALESCE(r.returning, 0) AS returning, COALESCE(n.joined, 0) AS joined
    FROM r FULL JOIN n ON n.bucket = r.bucket`;
  const labels =
    w.period === "year"
      ? [w.labels[0], w.labels[w.labels.length - 1]]
      : [dayLabel(keys[0]), dayLabel(keys[keys.length - 1])];
  return {
    returning: fill(
      rows.map((r) => ({ bucket: r.bucket, total: r.returning })),
      unit,
      keys,
    ),
    new: fill(
      rows.map((r) => ({ bucket: r.bucket, total: r.joined })),
      unit,
      keys,
    ),
    labels,
  };
}

async function cohorts() {
  const months = recentMonths(6);
  const rows = await prisma.$queryRaw<
    { cohort: Date; month: Date | null; total: number }[]
  >`
    WITH cohort AS (
      SELECT id, date_trunc('month', created_at AT TIME ZONE ${LAGOS}) AS m
      FROM profiles WHERE created_at >= ${months[0].start}
    ), act AS (
      SELECT DISTINCT e.user_id, date_trunc('month', e.created_at AT TIME ZONE ${LAGOS}) AS m
      FROM events e JOIN cohort c ON c.id = e.user_id
      WHERE e.created_at >= ${months[0].start}
    )
    SELECT m AS cohort, NULL::timestamp AS month, COUNT(*)::float8 AS total
    FROM cohort GROUP BY 1
    UNION ALL
    SELECT c.m, a.m, COUNT(*)::float8
    FROM cohort c JOIN act a ON a.user_id = c.id AND a.m > c.m
    GROUP BY 1, 2`;
  const key = (d: Date) => bucketKeyFromLocal("month", d);
  const size = new Map<string, number>();
  const active = new Map<string, number>();
  for (const row of rows) {
    if (row.month)
      active.set(`${key(row.cohort)}|${key(row.month)}`, row.total);
    else size.set(key(row.cohort), row.total);
  }
  return months.map((cohort, i) => {
    const joined = size.get(cohort.key) ?? 0;
    return {
      label: cohort.label,
      values: Array.from({ length: 6 }, (_, k) => {
        if (i + k > months.length - 1 || !joined) return null;
        if (k === 0) return 100;
        const count = active.get(`${cohort.key}|${months[i + k].key}`) ?? 0;
        return Math.round((count / joined) * 100);
      }),
    };
  });
}

async function holders() {
  const [row] = await prisma.$queryRaw<
    { total: number; top10: number; top100: number }[]
  >`
    SELECT
      (SELECT COALESCE(SUM(total_points), 0) FROM profiles WHERE total_points > 0)::float8 AS total,
      (SELECT COALESCE(SUM(total_points), 0) FROM (SELECT total_points FROM profiles
        WHERE total_points > 0 ORDER BY total_points DESC LIMIT 10) t)::float8 AS top10,
      (SELECT COALESCE(SUM(total_points), 0) FROM (SELECT total_points FROM profiles
        WHERE total_points > 0 ORDER BY total_points DESC LIMIT 100) t)::float8 AS top100`;
  const share = (v: number) =>
    row.total ? Math.round((v / row.total) * 100) : 0;
  return {
    rows: [
      {
        label: "Top 10 holders",
        value: share(row.top10),
        tone: "gold" as Tone,
      },
      {
        label: "Holders 11–100",
        value: share(row.top100 - row.top10),
        tone: "blue" as Tone,
      },
      {
        label: "Everyone else",
        value: share(row.total - row.top100),
        tone: "green" as Tone,
      },
    ],
    top100Share: share(row.top100),
  };
}

function changeMetric(
  label: string,
  value: string,
  current: number,
  previous: number,
  suffix = "",
): Metric {
  const change = formatChange(current, previous);
  return {
    label,
    value,
    change: change ? `${change.text}${suffix}` : undefined,
    tone: change?.negative ? "red" : "green",
  };
}

async function loadWorkspaceData(period: Period): Promise<WorkspaceData> {
  const w = getReportingWindow(period);

  const [
    totals,
    series,
    count,
    status,
    campaigns,
    eiza,
    referral,
    users,
    activity,
    retention,
    holderShare,
  ] = await Promise.all([
    giftTotals(w),
    giftSeries(w),
    counts(w),
    campaignStatus(),
    period === "day" ? topCampaigns(w) : Promise.resolve([]),
    eizaIssued(w),
    ambassadors(w),
    usersPanel(),
    userActivity(w),
    cohorts(),
    holders(),
  ]);

  const pledgeNow = count.pledges ? count.pledges_fulfilled / count.pledges : 0;
  const pledgeBefore = count.prev_pledges
    ? count.prev_pledges_fulfilled / count.prev_pledges
    : 0;
  const pledgePoints = formatPoints(pledgeNow, pledgeBefore);

  const metrics: Metric[] = [
    changeMetric(
      period === "day"
        ? "Donations today"
        : period === "month"
          ? "Total donations"
          : "Donations this year",
      formatNaira(totals.total),
      totals.total,
      totals.prev_total,
      period === "day" ? " vs last week" : period === "year" ? " YoY" : "",
    ),
    changeMetric(
      period === "day" ? "Donors today" : "Donors",
      formatCount(totals.donors),
      totals.donors,
      totals.prev_donors,
    ),
  ];
  if (period === "day") {
    metrics.push(
      {
        label: "Pledges due today",
        value: formatCount(count.due),
        change: `${formatCount(count.due_paid)} paid`,
        tone: "gold",
      },
      changeMetric(
        "New users today",
        formatCount(count.new_users),
        count.new_users,
        count.prev_new_users,
      ),
    );
  } else {
    metrics.push(
      {
        label: "Pledge → donation",
        value: formatPercent(pledgeNow),
        change:
          count.pledges || count.prev_pledges ? pledgePoints.text : undefined,
        tone: pledgePoints.negative ? "red" : "green",
      },
      period === "month"
        ? {
            label: "Active campaigns",
            value: formatCount(status.active),
            change: `${formatCount(status.inactive)} inactive`,
            tone: "gold",
          }
        : {
            label: "Campaigns funded",
            value: formatCount(count.funded),
            change: count.approved
              ? `${formatPercent(count.funded / count.approved)} success`
              : undefined,
            tone: "green",
          },
    );
  }

  return {
    period,
    generatedAt: new Date().toISOString(),
    label: w.label,
    previousLabel: w.previousLabel,
    metrics,
    donations: { ...series, labels: w.labels },
    topCampaigns: campaigns,
    campaignStatus: {
      segments: [
        {
          label: "Active",
          value: status.active,
          display: formatCount(status.active),
        },
        {
          label: "Inactive 21+ days",
          value: status.inactive,
          display: formatCount(status.inactive),
        },
        {
          label: "Paused",
          value: status.paused,
          display: formatCount(status.paused),
        },
      ],
      total: formatCount(status.active + status.inactive + status.paused),
    },
    eiza: {
      segments: eiza.segments,
      total: formatCount(eiza.total, { short: true }),
    },
    ambassadors: referral.team,
    users,
    yearSummary: [
      ["Donors", formatCount(totals.donors)],
      [
        "Gifts per donor",
        totals.donors ? (totals.gifts / totals.donors).toFixed(1) : "—",
      ],
      [
        "Average gift",
        formatNaira(totals.gifts ? totals.total / totals.gifts : 0, {
          exact: true,
        }),
      ],
      ["EIZA issued", formatCount(eiza.total, { short: true })],
      ["New users", formatCount(count.new_users)],
      [
        "Ambassador-driven",
        `${formatNaira(referral.allDriven)} · ${
          totals.total ? formatPercent(referral.allDriven / totals.total) : "0%"
        }`,
      ],
    ],
    userActivity: activity,
    cohorts: retention,
    holders: holderShare,
    navCounts: {
      Campaigns: count.pending_causes,
      KYC: count.pending_kyc,
      "Petitions & bounties": count.pending_petitions,
    },
  };
}

// Admin-only data (callers must check the role first), shared across admins
// and refreshed every two minutes so reloads don't re-run every aggregate.
export const getWorkspaceData = unstable_cache(
  loadWorkspaceData,
  ["admin-workspace-analytics"],
  { revalidate: CACHE_SECONDS, tags: ["admin-analytics"] },
);
