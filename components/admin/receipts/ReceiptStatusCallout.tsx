import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { countWord } from "@/lib/causes/discover-summary";
import { formatDate } from "@/lib/format-date";
import { formatNaira } from "@/lib/receipts/receipt-check";
import type { ReceiptFieldRow } from "@/types/receipt-types";

/** Names the exact mismatch: the amount gap first, otherwise the first field that differs. */
function mismatchSummary(
  rows: ReceiptFieldRow[],
  claimed: number | null,
  read: number | null,
) {
  if (claimed != null && read != null && claimed !== read) {
    if (read > claimed) {
      return `The receipt shows ${formatNaira(read)}, ${formatNaira(read - claimed)} more than claimed. This may be a typo.`;
    }
    const ratio = claimed / read;
    const gap =
      ratio >= 2 && Math.abs(ratio - Math.round(ratio)) < 0.01
        ? `${countWord(Math.round(ratio))} times less`
        : `${formatNaira(claimed - read)} less`;
    return `The receipt shows ${formatNaira(read)}, ${gap} than claimed. This may be a typo or an inflated claim.`;
  }
  const differing = rows.find((row) => row.result === "differs");
  return differing
    ? `The ${differing.field.toLowerCase()} on the receipt reads ${differing.onReceipt}, but the creator entered ${differing.entered}.`
    : null;
}

export function ReceiptStatusCallout({
  status,
  rows,
  claimed,
  read,
  verifiedAmount,
  rejectionReason,
  infoReason,
  infoMessage,
  infoReplyBy,
}: {
  status: string;
  rows: ReceiptFieldRow[];
  claimed: number | null;
  read: number | null;
  verifiedAmount: number | null;
  rejectionReason: string | null;
  infoReason: string | null;
  infoMessage: string | null;
  infoReplyBy: Date | null;
}) {
  if (status === "approved") {
    return (
      <CalloutBanner
        variant="forest"
        icon={<CheckCircle className="mt-0.5 h-4 w-4 text-forest" />}
        title={
          verifiedAmount == null
            ? "Receipt verified"
            : `Verified at ${formatNaira(verifiedAmount)}`
        }
        description="The update is live on the campaign page and its milestone is satisfied."
      />
    );
  }
  if (status === "rejected") {
    return (
      <CalloutBanner
        variant="rust"
        title="Receipt rejected"
        description={
          rejectionReason ?? "The creator was asked to upload a new receipt."
        }
      />
    );
  }
  if (status === "superseded") {
    return (
      <CalloutBanner
        variant="neutral"
        title="Replaced by a newer upload"
        description="The creator replied to the info request with a new receipt, which is in the queue."
      />
    );
  }
  if (status === "need_info") {
    return (
      <CalloutBanner
        variant="gold"
        icon={<Clock className="mt-0.5 h-4 w-4" />}
        title={`${infoReason ?? "Info requested"} · reply by ${formatDate(infoReplyBy)}`}
        description={infoMessage}
      />
    );
  }

  const summary = mismatchSummary(rows, claimed, read);
  if (!summary) return null;
  return (
    <CalloutBanner
      variant="rust"
      icon={<AlertTriangle className="mt-0.5 h-4 w-4 text-rust" />}
      title={summary}
    />
  );
}
