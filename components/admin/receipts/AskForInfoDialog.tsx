"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { ArrowRight, Receipt } from "lucide-react";
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
import { requestReceiptInfo } from "@/actions/admin/admin-receipt-actions";
import {
  receiptInfoReasonOptions,
  receiptReplyByOptions,
} from "@/lib/options/receipt-review.options";
import { askReceiptInfoSchema } from "@/lib/schemas/receipt-review.schema";

const replyByDate = (days: string) =>
  new Date(Date.now() + Number(days) * 86_400_000).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export function AskForInfoDialog({
  receiptId,
  receiptLabel,
  creatorName,
  suggestedReason,
  suggestedMessage,
}: {
  receiptId: string;
  receiptLabel: string;
  creatorName: string;
  suggestedReason: string;
  suggestedMessage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({
    receiptId,
    reason: suggestedReason,
    message: suggestedMessage,
    replyByDays: "3",
  });
  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const { errors, validate } = useValidator({
    store: form,
    schema: askReceiptInfoSchema,
  });

  const handleSend = async () => {
    setSubmitError(null);
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    const result = await requestReceiptInfo(form);
    setIsSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setOpen(false);
    router.push(
      `/dashboard/admin/receipts?tab=need-info&flash=info&receipt=${receiptLabel}&name=${encodeURIComponent(creatorName)}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="surface" size="sm">
          Ask for info
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sand text-ink">
              <Receipt className="h-4 w-4" />
            </span>
            Ask {creatorName} for info
          </DialogTitle>
          <DialogDescription className="sr-only">
            Send {receiptLabel} back to the creator with what needs fixing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-info-reason">What&apos;s wrong?</Label>
            <Select
              value={form.reason}
              onValueChange={(value) => setFormFields("reason", value)}
            >
              <SelectTrigger id="receipt-info-reason" className="bg-surface">
                <SelectValue placeholder="Choose a reason" />
              </SelectTrigger>
              <SelectContent>
                {receiptInfoReasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.reason} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-info-message">Message</Label>
            <Textarea
              id="receipt-info-message"
              value={form.message}
              onChange={(event) => setFormFields("message", event.target.value)}
              className="min-h-[96px] bg-surface"
              disabled={isSubmitting}
            />
            <FieldError message={errors.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-info-reply-by">Reply by</Label>
            <Select
              value={form.replyByDays}
              onValueChange={(value) => setFormFields("replyByDays", value)}
            >
              <SelectTrigger id="receipt-info-reply-by" className="bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {receiptReplyByOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {`${replyByDate(option.value)} · ${option.label}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ink/50">
              If there&apos;s no reply, the receipt is rejected and the funds
              stay in escrow.
            </p>
            <FieldError message={errors.replyByDays} />
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
          <Button variant="ink" onClick={handleSend} disabled={isSubmitting}>
            <ArrowRight className="mr-1.5 h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
