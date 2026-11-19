import type { Option } from "@/types/options";

export const kycRedoOptions: readonly Option[] = [
  { label: "New live selfie in good light", value: "selfie" },
  { label: "Confirm date of birth", value: "date_of_birth" },
  { label: "Upload a different ID", value: "id_document" },
];

export const kycStatusTabs = [
  {
    label: "Needs review",
    value: "needs-review",
    statuses: ["pending", "in_progress"],
  },
  { label: "Resubmitted", value: "resubmitted", statuses: ["resubmitted"] },
  { label: "Approved", value: "approved", statuses: ["approved"] },
  { label: "Rejected", value: "rejected", statuses: ["rejected"] },
] as const satisfies readonly {
  label: string;
  value: string;
  statuses: string[];
}[];

export const KYC_FACE_MATCH_THRESHOLD = 80;

export const kycIdTypeFilterOptions: readonly Option[] = [
  { label: "All ID types", value: "all" },
  { label: "NIN", value: "national_id" },
  { label: "Passport", value: "passport" },
  { label: "Driver's licence", value: "drivers_license" },
  { label: "Voter's card", value: "voters_card" },
  { label: "BVN", value: "bvn" },
];
