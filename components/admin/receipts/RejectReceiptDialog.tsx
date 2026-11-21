"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useValidator } from "@/hooks/use-validator";
import { rejectReceipt } from "@/actions/admin/admin-receipt-actions";
import { receiptRejectReasonOptions } from "@/lib/options/receipt-review.options";
import { rejectReceiptSchema } from "@/lib/schemas/receipt-review.schema";

export function RejectReceiptDialog({
  receiptId,
  receiptLabel,
  creatorName,
  returnTab,
}: {
  receiptId: string;
  receiptLabel: string;
  creatorName: string;
  returnTab: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({ receiptId, reason: "", note: "" });
  const setFormFields = (key: "reason" | "note", value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const { errors, validate } = useValidator({
    store: form,
    schema: rejectReceiptSchema,
  });

  const handleReject = async () => {
    setSubmitError(null);
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    const result = await rejectReceipt(form);
    setIsSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setOpen(false);
    router.push(
      `/dashboard/admin/receipts?tab=${returnTab}&flash=rejected&receipt=${receiptLabel}&name=${encodeURIComponent(creatorName)}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="surface" size="sm">
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rust/10 text-rust">
              <XCircle className="h-4 w-4" />
            </span>
            Reject {receiptLabel}
          </DialogTitle>
          <DialogDescription>
            {creatorName} is emailed the reason and the milestone goes back to
            waiting for a new receipt. This can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-reject-reason">Reason</Label>
            <Select
              value={form.reason}
              onValueChange={(value) => setFormFields("reason", value)}
            >
              <SelectTrigger id="receipt-reject-reason" className="bg-surface">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {receiptRejectReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.reason} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-reject-note">Note to the creator</Label>
            <Textarea
              id="receipt-reject-note"
              value={form.note}
              onChange={(event) => setFormFields("note", event.target.value)}
              placeholder="Optional: what they should upload instead"
              className="min-h-[96px] bg-surface"
              disabled={isSubmitting}
            />
            <FieldError message={errors.note} />
            {submitError && <FieldError message={submitError} />}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="surface"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button variant="rust" onClick={handleReject} disabled={isSubmitting}>
            {isSubmitting ? "Rejecting..." : "Reject receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
