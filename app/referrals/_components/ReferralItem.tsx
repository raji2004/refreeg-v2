import type { ReferralRow } from "@/actions/users/referral-actions";
import { cn } from "@/lib/utils";

import { shortDate } from "./referral-format";

export function ReferralItem({ row }: { row: ReferralRow }) {
  const name =
    row.profiles?.first_name ||
    row.referee_email?.split("@")[0] ||
    "Invited friend";
  const registered = !!row.registered;
  const issued = row.reward_status === "ISSUED";

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-hairline py-5 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-ink">{name}</p>
        {row.referee_email && (
          <p className="truncate text-xs text-ink/50">{row.referee_email}</p>
        )}
      </div>
      <p
        className={cn(
          "order-3 text-xs font-medium sm:order-none sm:text-sm",
          registered ? "text-forest" : "text-amber",
        )}
      >
        {registered ? "Registered" : "Invited"}
      </p>
      <p className="order-4 text-xs text-ink/60 sm:order-none sm:text-sm">
        {shortDate(row.created_at)}
      </p>
      <p
        className={cn(
          "text-right",
          issued
            ? "font-fraunces text-xl text-forest"
            : "text-xs font-medium text-amber",
        )}
      >
        {issued ? "+5 pts" : "Awaiting KYC"}
      </p>
    </li>
  );
}
