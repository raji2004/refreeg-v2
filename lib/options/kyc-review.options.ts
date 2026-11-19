import type { Option } from "@/types/options";

/** Checkbox choices in the "Ask to resubmit" dialog, mapped to Didit nodes. */
export const kycRedoOptions: readonly Option[] = [
  { label: "New live selfie in good light", value: "selfie" },
  { label: "Confirm date of birth", value: "date_of_birth" },
  { label: "Upload a different ID", value: "id_document" },
];

/** Queue tabs, with the row statuses each one covers. */
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

/** Review policy: approve is held below this face match score. */
export const KYC_FACE_MATCH_THRESHOLD = 80;

const idTypeLabels: Record<string, string> = {
  national_id: "NIN",
  nin: "NIN",
  nin_slip: "NIN slip",
  voters_card: "Voter's card",
  drivers_license: "Driver's licence",
  passport: "Passport",
  bvn: "BVN",
  cac: "CAC document",
  didit: "Didit session",
};

export const kycIdTypeFilterOptions: readonly Option[] = [
  { label: "All ID types", value: "all" },
  { label: "NIN", value: "national_id" },
  { label: "Passport", value: "passport" },
  { label: "Driver's licence", value: "drivers_license" },
  { label: "Voter's card", value: "voters_card" },
  { label: "BVN", value: "bvn" },
];

/** `national_id` -> `NIN`; unknown raw values become readable words. */
export const formatIdTypeLabel = (raw: string | null | undefined): string => {
  if (!raw) return "ID document";
  const key = raw.toLowerCase();
  if (idTypeLabels[key]) return idTypeLabels[key];
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};
