"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReferrerDonors } from "@/hooks/use-referrals";
import { formatNairaShort } from "@/lib/causes/discover-summary";
import { formatDate } from "@/lib/format-date";

export function DonorBreakdownDialog({
  referrerId,
  onClose,
}: {
  referrerId: string | null;
  onClose: () => void;
}) {
  const { detail, loading, error } = useReferrerDonors(referrerId);
  const donations = detail?.donations ?? [];
  const message = loading
    ? "Loading donors…"
    : (error ?? "No donations from their referrals yet.");

  return (
    <Dialog open={!!referrerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl font-normal">
            Donors referred by{" "}
            <em>{detail?.referrer.fullName ?? "this champion"}</em>
          </DialogTitle>
        </DialogHeader>
        {donations.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink/60">{message}</p>
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
                    {donation.cause.title} · {formatDate(donation.createdAt)}
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
