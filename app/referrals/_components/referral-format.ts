import { format } from "date-fns";

export const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

export const shortDate = (iso: string | null) =>
  iso ? format(new Date(iso), "d MMM yyyy") : "—";

export const plural = (count: number, word: string) =>
  `${count.toLocaleString()} ${count === 1 ? word : `${word}s`}`;
