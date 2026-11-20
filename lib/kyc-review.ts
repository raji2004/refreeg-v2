import { kycStatusTabs } from "@/lib/options/kyc-review.options";
import type { KycQueueTab } from "@/types/kyc-types";

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

export const formatIdTypeLabel = (raw: string | null | undefined): string => {
  if (!raw) return "ID document";
  const key = raw.toLowerCase();
  if (idTypeLabels[key]) return idTypeLabels[key];
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export const kycTabStatuses = Object.fromEntries(
  kycStatusTabs.map((tab) => [tab.value, [...tab.statuses]]),
) as Record<KycQueueTab, string[]>;

export function initials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
