import { Badge } from "@/components/ui/badge";
import type { KycStatus } from "@/types/kyc-types";

const statusConfig: Record<
  KycStatus,
  { label: string; variant: "pending" | "blue" | "verified" | "destructive" }
> = {
  pending: { label: "Needs review", variant: "pending" },
  in_progress: { label: "Needs review", variant: "pending" },
  resubmitted: { label: "Resubmitted", variant: "blue" },
  approved: { label: "Approved", variant: "verified" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function KycStatusBadge({ status }: { status: KycStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
