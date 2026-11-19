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
