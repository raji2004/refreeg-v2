const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export const formatNaira = (value: number) => naira.format(value);

export const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

export const formatMonthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

export function ordinalDay(iso: string) {
  const day = new Date(iso).getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${day}${suffix}`;
}
