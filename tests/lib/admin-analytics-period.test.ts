import {
  bucketKeyFromLocal,
  getReportingWindow,
  lagosToday,
  recentMonths,
} from "@/lib/admin-analytics/period";

// 23:30 UTC on 10 Nov is 00:30 on 11 Nov in Lagos.
const now = new Date("2026-11-10T23:30:00.000Z");

it("uses Lagos midnight for the day window and compares with last week", () => {
  const w = getReportingWindow("day", now);
  expect(w.from.toISOString()).toBe("2026-11-10T23:00:00.000Z");
  expect(w.previousTo.toISOString()).toBe("2026-11-03T23:30:00.000Z");
  expect(w.buckets).toHaveLength(24);
  expect(w.buckets[0]).toBe("2026-11-11T00");
  expect(lagosToday(now).toISOString()).toBe("2026-11-11T00:00:00.000Z");
});

it("compares month-to-date with the same span of the previous month", () => {
  const w = getReportingWindow("month", now);
  expect(w.from.toISOString()).toBe("2026-10-31T23:00:00.000Z");
  expect(w.previousFrom.toISOString()).toBe("2026-09-30T23:00:00.000Z");
  expect(w.buckets).toHaveLength(11);
  expect(w.buckets[10]).toBe("2026-11-11");
  expect(w.previousBuckets[0]).toBe("2026-10-01");
});

it("leaves comparison buckets empty past the end of a shorter month", () => {
  const w = getReportingWindow("month", new Date("2026-03-31T12:00:00.000Z"));
  expect(w.previousBuckets[27]).toBe("2026-02-28");
  expect(w.previousBuckets.slice(28)).toEqual(["", "", ""]);
});

it("builds year-to-date monthly buckets", () => {
  const w = getReportingWindow("year", now);
  expect(w.buckets).toHaveLength(11);
  expect(w.previousBuckets[10]).toBe("2025-11");
  expect(w.labels.at(-1)).toBe("Nov");
});

it("reads date_trunc results as Lagos wall-clock", () => {
  expect(bucketKeyFromLocal("hour", new Date("2026-11-11T05:00:00.000Z"))).toBe(
    "2026-11-11T05",
  );
  expect(recentMonths(3, now).map((m) => m.key)).toEqual([
    "2026-09",
    "2026-10",
    "2026-11",
  ]);
});
