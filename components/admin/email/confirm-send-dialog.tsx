"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { peopleLabel } from "@/lib/email/people-label";

export function ConfirmSendDialog({
  open,
  reach,
  audienceLabel,
  scheduledFor,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  reach: number | null;
  audienceLabel: string;
  /** Formatted time, or null to send right away. */
  scheduledFor: string | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const people = reach === null ? audienceLabel : peopleLabel(reach);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {scheduledFor ? `Schedule for ${people}?` : `Send to ${people}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {scheduledFor
              ? `It goes out ${scheduledFor} to ${audienceLabel.toLowerCase()}.`
              : `It goes out now to ${audienceLabel.toLowerCase()}.`}{" "}
            Emails cannot be recalled once they are sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Go back</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {pending ? "Sending…" : scheduledFor ? "Schedule" : "Send now"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
