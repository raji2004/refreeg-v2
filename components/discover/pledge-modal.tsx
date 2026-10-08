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
      <ResponsiveDialogContent className="max-h-[92vh] overflow-y-auto border-none bg-transparent p-0 shadow-none [scrollbar-width:none] sm:max-w-[452px] [&::-webkit-scrollbar]:hidden [&>button]:hidden">
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
