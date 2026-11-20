"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { useValidator } from "@/hooks/use-validator";
import { rejectKycSchema } from "@/lib/schemas/kyc-review.schema";
import { updateVerificationStatus } from "@/actions/users/kyc-actions";

interface KycRejectionDialogProps {
  kycId: string;
  applicantFirstName?: string | null;
}

export default function KycRejectionDialog({
  kycId,
  applicantFirstName,
}: KycRejectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [form, setForm] = useState({ verificationId: kycId, reason: "" });

  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const { errors, validate } = useValidator({
    store: form,
    schema: rejectKycSchema,
  });

  const router = useRouter();

  const rejectMutation = useMutation({
    mutationFn: () =>
      updateVerificationStatus(
        form.verificationId,
        "rejected",
        form.reason.trim(),
      ),
    onSuccess: ({ error }) => {
      if (error) {
        setSubmitError(error);
        return;
      }
      setOpen(false);
      setFormFields("reason", "");
      router.push(
        `/dashboard/admin/users/kyc?flash=rejected&name=${encodeURIComponent(
          applicantFirstName || "The applicant",
        )}`,
      );
    },
    onError: (mutationError) => {
      setSubmitError(mutationError.message);
    },
  });

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validate() || rejectMutation.isPending) return;
    rejectMutation.mutate();
  };

  const isSubmitting = rejectMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSubmitError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="rust" disabled={isSubmitting}>
          <XCircle className="mr-2 h-4 w-4" />
          Reject KYC
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reject KYC Verification</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this KYC verification. This
            reason will be shown to the user and sent via email.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Rejection Reason
            </label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for rejection..."
              value={form.reason}
              onChange={(e) => setFormFields("reason", e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            <FieldError message={errors.reason} />
            {submitError && <FieldError message={submitError} />}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button variant="rust" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Rejecting..." : "Reject KYC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
