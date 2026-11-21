"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { isAdminOrManager } from "@/actions/admin/role-actions";
import { runHealthChecks } from "@/lib/health/checks";

/** Sidebar badges and the top bar's system status for the admin shell. */
export async function getAdminShellSummary() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !(await isAdminOrManager(userId))) {
    return { success: false, error: "Unauthorized", data: null };
  }

  const [campaigns, kyc, receipts, petitions, health] = await Promise.all([
    prisma.cause.count({ where: { status: "pending" } }),
    prisma.kyc_verifications.count({
      where: { status: { in: ["pending", "in_progress"] } },
    }),
    prisma.campaign_proof_updates.count({ where: { status: "pending" } }),
    prisma.petitions.count({ where: { status: "pending" } }),
    runHealthChecks(),
  ]);

  return {
    success: true,
    error: null,
    data: {
      counts: { campaigns, kyc, receipts, petitions },
      systemsNormal: health.status === "operational",
    },
  };
}
