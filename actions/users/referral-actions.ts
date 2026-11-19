"use server";

import { auth } from "@/lib/auth/auth";
import {
  getReferralDashboardDataCore,
  type ReferralDashboardData,
  type ReferralRow,
} from "@/lib/referrals/referral-dashboard-core";

export type { ReferralDashboardData, ReferralRow };

export async function getReferralDashboardData(): Promise<ReferralDashboardData | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return getReferralDashboardDataCore(session.user.id);
}
