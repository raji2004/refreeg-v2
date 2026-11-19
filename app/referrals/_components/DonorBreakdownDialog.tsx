"use client";

import { useEffect, useState } from "react";

import {
  getReferrerDonorDetail,
  type ReferrerDonorDetailResult,
} from "@/actions/users/leaderboard-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import { toast } from "@/hooks/use-toast";

import { shortDate } from "./referral-format";

export function DonorBreakdownDialog({
  referrerId,
  onClose,
}: {
  referrerId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ReferrerDonorDetailResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!referrerId) return;
    let cancelled = false;
    setDetail(null);
    setLoading(true);
    getReferrerDonorDetail(referrerId, { page: 1, pageSize: 50 })
      .then((res) => !cancelled && setDetail(res))
      .catch(() => {
        if (cancelled) return;
        toast({ title: "Couldn't load donor details", variant: "destructive" });
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referrerId]);

  const donations = detail?.donations ?? [];

  return (
    <Dialog open={!!referrerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl font-normal">
            Donors referred by{" "}
            <em>{detail?.referrer.fullName ?? "this champion"}</em>
          </DialogTitle>
        </DialogHeader>
        {loading || donations.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink/60">
            {loading
              ? "Loading donors…"
              : "No donations from their referrals yet."}
          </p>
        ) : (
          <ul className="max-h-[50vh] overflow-y-auto pr-1">
            {donations.map((donation) => (
              <li
                key={donation.id}
                className="flex items-center justify-between gap-3 border-b border-hairline py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {donation.isAnonymous
                      ? "Anonymous donor"
                      : donation.donorName}
                  </p>
                  <p className="truncate text-xs text-ink/50">
                    {donation.cause.title} · {shortDate(donation.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 font-fraunces text-lg text-ink">
                  {formatNairaShort(donation.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
