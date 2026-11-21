import { Badge } from "@/components/ui/badge";
import type { ReceiptMatch } from "@/types/receipt-types";

const matchConfig: Record<
  ReceiptMatch,
  { label: string; variant: "verified" | "critical" | "pending" }
> = {
  match: { label: "Match", variant: "verified" },
  mismatch: { label: "Mismatch", variant: "critical" },
  manual: { label: "Manual", variant: "pending" },
};

export function ReceiptMatchBadge({ match }: { match: ReceiptMatch }) {
  const config = matchConfig[match];
  return (
    <Badge variant={config.variant} className="gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </Badge>
  );
}
