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
import { Textarea } from "@/components/ui/textarea";
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
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleReject = async () => {
    if (!reason.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const { error } = await updateVerificationStatus(
      kycId,
      "rejected",
      reason.trim(),
    );
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    setOpen(false);
    setReason("");
    router.push(
      `/dashboard/admin/users/kyc?flash=rejected&name=${encodeURIComponent(
        applicantFirstName || "The applicant",
      )}`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" disabled={isSubmitting}>
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
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
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
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || isSubmitting}
          >
            {isSubmitting ? "Rejecting..." : "Reject KYC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
