import type { Option } from "@/types/options";

export const emailAudienceOptions = [
  { label: "All users", value: "all_users" },
  { label: "Campaign owners", value: "campaign_owners" },
  {
    label: "Campaign owners · identity verified",
    value: "campaign_owners_verified",
  },
  { label: "Donors", value: "donors" },
  { label: "Identity verified users", value: "verified_users" },
  { label: "Organisations", value: "organisations" },
] as const satisfies readonly Option[];

export type EmailAudience = (typeof emailAudienceOptions)[number]["value"];

export const emailAudienceValues = emailAudienceOptions.map(
  (option) => option.value,
) as [EmailAudience, ...EmailAudience[]];
