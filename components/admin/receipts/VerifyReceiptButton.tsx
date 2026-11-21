"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { verifyReceipt } from "@/actions/admin/admin-receipt-actions";
import { formatNaira } from "@/lib/receipts/receipt-check";

/** "Mark verified", or "Verify at ₦X" when the receipt shows a different amount than the creator claimed. */
export function VerifyReceiptButton({
  receiptId,
  receiptLabel,
  amount,
  atReceiptAmount,
  returnTab,
}: {
  receiptId: string;
  receiptLabel: string;
  amount: number | null;
  atReceiptAmount: boolean;
  returnTab: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    const result = await verifyReceipt(receiptId, amount);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const amountParam = amount == null ? "" : `&amount=${amount}`;
    router.push(
      `/dashboard/admin/receipts?tab=${returnTab}&flash=verified&receipt=${receiptLabel}${amountParam}`,
    );
  };

  return (
    <div className="space-y-2">
      <Button
        variant="ink"
        className="w-full"
        onClick={handleVerify}
        disabled={isSubmitting}
      >
        <Check className="mr-2 h-4 w-4" />
        {isSubmitting
          ? "Verifying..."
          : atReceiptAmount && amount != null
            ? `Verify at ${formatNaira(amount)}`
            : "Mark verified"}
      </Button>
      {error && <FieldError message={error} />}
    </div>
  );
}
