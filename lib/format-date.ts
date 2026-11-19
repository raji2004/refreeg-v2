const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Shared list-row date renderer: `12 Jan 2026`, `Not available` when missing. */
export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return dateFormatter.format(date);
};

const pluralize = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? "" : "s"}`;

/** Queue-style age: `9h ago`, `3d ago`, otherwise the shared date renderer. */
export const formatRelativeTime = (value: string | Date | null | undefined) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

/** Applicant-rail age: `3 weeks`, `8 months`, `2 years`. */
export const formatAccountAge = (value: string | Date | null | undefined) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  const days = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86_400_000),
  );
  if (days < 31) return pluralize(Math.max(days, 1), "day");
  if (days < 365) return pluralize(Math.round(days / 30), "month");
  return pluralize(Math.floor(days / 365), "year");
};
