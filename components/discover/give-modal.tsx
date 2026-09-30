"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { Skeleton } from "@/components/ui/skeleton";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Clock3 } from "lucide-react";
import { getQuickDonateProps } from "@/actions/cause-actions";
import QuickDonateForm from "@/app/causes/[id]/donate/QuickDonateForm";

type QuickDonateProps = NonNullable<
  Awaited<ReturnType<typeof getQuickDonateProps>>
>;

export function GiveModal({
  causeId,
  open,
  onOpenChange,
}: {
  causeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [props, setProps] = useState<QuickDonateProps | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getQuickDonateProps(causeId).then((result) => {
      if (!cancelled) {
        setProps(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, causeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md p-0 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto bg-transparent border-none shadow-none">
        <DialogTitle className="sr-only">Give now</DialogTitle>
        {loading || !props ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : props.paused ? (
          <div className="rounded-2xl border border-ink/15 bg-cream p-6">
            <CalloutBanner
              variant="gold"
              icon={<Clock3 className="mt-0.5 h-5 w-5 shrink-0" />}
              title="This campaign is paused"
              description="Its owner is updating the campaign details — donations are on hold until that's reviewed and approved."
            />
          </div>
        ) : (
          <QuickDonateForm {...props} variant="modal" />
        )}
      </ResponsiveDialogContent>
    </Dialog>
  );
}
