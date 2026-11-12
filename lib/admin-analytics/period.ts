import type { Period } from "@/components/admin/workspace/types";

// Reporting windows follow Lagos wall-clock time (WAT, UTC+1, no DST).
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type BucketUnit = "hour" | "day" | "month";

export type ReportingWindow = {
  period: Period;
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
  /** End of the comparison chart's range, which may run past previousTo. */
  previousChartTo: Date;
  unit: BucketUnit;
  /** Bucket keys (Lagos wall-clock, see bucketKey) for the current chart. */
  buckets: string[];
  /** Bucket keys for the comparison chart, aligned index-by-index. */
  previousBuckets: string[];
  labels: string[];
  label: string;
  previousLabel: string;
};

/** Lagos wall-clock fields for an instant. */
function lagos(date: Date) {
  const d = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    h: d.getUTCHours(),
  };
}

/** The UTC instant of a Lagos wall-clock time. */
function fromLagos(y: number, m: number, d = 1, h = 0) {
  return new Date(Date.UTC(y, m, d, h) - LAGOS_OFFSET_MS);
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** Key for a bucket start given as Lagos wall-clock fields. */
export function bucketKey(
  unit: BucketUnit,
  y: number,
  m: number,
  d = 1,
  h = 0,
) {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (unit === "month") return `${y}-${pad(m + 1)}`;
  if (unit === "day") return `${y}-${pad(m + 1)}-${pad(d)}`;
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}`;
}

/**
 * Key for a timestamp-without-time-zone returned by
 * `date_trunc(unit, created_at AT TIME ZONE 'Africa/Lagos')`: the driver reads
 * it as UTC, so its UTC fields already hold Lagos wall-clock values.
 */
export function bucketKeyFromLocal(unit: BucketUnit, local: Date) {
  return bucketKey(
    unit,
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
    local.getUTCHours(),
  );
}

export function getReportingWindow(
  period: Period,
  now = new Date(),
): ReportingWindow {
  const t = lagos(now);

  if (period === "day") {
    const from = fromLagos(t.y, t.m, t.d);
    const previousFrom = new Date(from.getTime() - 7 * DAY_MS);
    const buckets = Array.from({ length: 24 }, (_, h) =>
      bucketKey("hour", t.y, t.m, t.d, h),
    );
    const p = lagos(previousFrom);
    return {
      period,
      from,
      to: now,
      previousFrom,
      previousTo: new Date(now.getTime() - 7 * DAY_MS),
      previousChartTo: from,
      unit: "hour",
      buckets,
      previousBuckets: Array.from({ length: 24 }, (_, h) =>
        bucketKey("hour", p.y, p.m, p.d, h),
      ),
      labels: ["00:00", "06:00", "12:00", "18:00", "23:00"],
      label: `Today · ${t.d} ${LONG_MONTHS[t.m]} ${t.y}`,
      previousLabel: "same time last week",
    };
  }

  if (period === "month") {
    const from = fromLagos(t.y, t.m);
    const py = t.m === 0 ? t.y - 1 : t.y;
    const pm = t.m === 0 ? 11 : t.m - 1;
    const previousFrom = fromLagos(py, pm);
    const elapsed = now.getTime() - from.getTime();
    const previousChartTo = from;
    const previousTo = new Date(
      Math.min(previousFrom.getTime() + elapsed, previousChartTo.getTime()),
    );
    const days = t.d;
    const previousDays = daysInMonth(py, pm);
    return {
      period,
      from,
      to: now,
      previousFrom,
      previousTo,
      previousChartTo,
      unit: "day",
      buckets: Array.from({ length: days }, (_, i) =>
        bucketKey("day", t.y, t.m, i + 1),
      ),
      previousBuckets: Array.from({ length: days }, (_, i) =>
        i < previousDays ? bucketKey("day", py, pm, i + 1) : "",
      ),
      labels:
        days > 1
          ? [`1 ${MONTHS[t.m]}`, `${days} ${MONTHS[t.m]}`]
          : [`1 ${MONTHS[t.m]}`],
      label: `${LONG_MONTHS[t.m]} ${t.y} to date`,
      previousLabel: LONG_MONTHS[pm],
    };
  }

  const from = fromLagos(t.y, 0);
  const previousFrom = fromLagos(t.y - 1, 0);
  const elapsed = now.getTime() - from.getTime();
  return {
    period,
    from,
    to: now,
    previousFrom,
    previousTo: new Date(previousFrom.getTime() + elapsed),
    previousChartTo: fromLagos(t.y - 1, t.m + 1),
    unit: "month",
    buckets: Array.from({ length: t.m + 1 }, (_, m) =>
      bucketKey("month", t.y, m),
    ),
    previousBuckets: Array.from({ length: t.m + 1 }, (_, m) =>
      bucketKey("month", t.y - 1, m),
    ),
    labels: MONTHS.slice(0, t.m + 1),
    label: `${t.y} to date`,
    previousLabel: String(t.y - 1),
  };
}

/** "2026-11-04" → "4 Nov". */
export function dayLabel(key: string) {
  return `${Number(key.slice(8, 10))} ${MONTHS[Number(key.slice(5, 7)) - 1]}`;
}

/** Calendar date (UTC midnight) of today in Lagos, for @db.Date columns. */
export function lagosToday(now = new Date()) {
  const t = lagos(now);
  return new Date(Date.UTC(t.y, t.m, t.d));
}

/** Lagos-month buckets for the last `count` months, oldest first. */
export function recentMonths(count: number, now = new Date()) {
  const t = lagos(now);
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const m = (((t.m - offset) % 12) + 12) % 12;
    const y = t.y + Math.floor((t.m - offset) / 12);
    return {
      key: bucketKey("month", y, m),
      label: MONTHS[m],
      start: fromLagos(y, m),
    };
  });
}

/** Last `count` Lagos days ending today, oldest first. */
export function recentDays(count: number, now = new Date()) {
  const t = lagos(now);
  const today = fromLagos(t.y, t.m, t.d);
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(today.getTime() - (count - 1 - i) * DAY_MS);
    const l = lagos(start);
    return { key: bucketKey("day", l.y, l.m, l.d), start };
  });
}
