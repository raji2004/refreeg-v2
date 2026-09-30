"use client";

import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { PledgeQuickForm } from "./pledge-quick-form";

export function PledgeModal({
  causeId,
  causeTitle,
  daysActive,
  defaultName,
  defaultEmail,
  open,
  onOpenChange,
}: {
  causeId: string;
  causeTitle: string;
  daysActive?: number | null;
  defaultName?: string;
  defaultEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md p-0 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Pledge to {causeTitle}</DialogTitle>
        <PledgeQuickForm
          causeId={causeId}
          causeTitle={causeTitle}
          daysActive={daysActive}
          defaultName={defaultName}
          defaultEmail={defaultEmail}
        />
      </ResponsiveDialogContent>
    </Dialog>
  );
}
