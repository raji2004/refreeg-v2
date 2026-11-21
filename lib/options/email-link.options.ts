import type { Option } from "@/types/options";

/** Select value for "no button"; Radix Select cannot hold an empty value. */
export const NO_LINK = "none";

/** Where the announcement button opens. */
export const emailLinkOptions = [
  { label: "Nothing, no button", value: NO_LINK },
  { label: "Dashboard", value: "/dashboard" },
  { label: "My campaigns", value: "/dashboard/causes" },
  { label: "My petitions", value: "/dashboard/petitions" },
  { label: "Wallet", value: "/wallet" },
] as const satisfies readonly Option[];

export const emailLinkValues: readonly string[] = emailLinkOptions.map(
  (option) => option.value,
);
