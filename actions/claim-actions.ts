"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Reconstructed causes (from the 2026-09-03 data-loss recovery) whose
 * recovered_owner_email matches the logged-in user's email — offered to
 * them as "is this yours?" on the dashboard.
 */
export async function getClaimableCauses() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return [];

  return prisma.cause.findMany({
    where: {
      reconstructed: true,
      recovered_owner_email: email.toLowerCase(),
    },
    select: {
      id: true,
      title: true,
      image: true,
      goal: true,
      raised: true,
    },
  });
}

export async function claimCause(causeId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return { data: null, error: "Sign in to claim a campaign." };
  }

  const cause = await prisma.cause.findUnique({ where: { id: causeId } });
  if (!cause) return { data: null, error: "Campaign not found." };
  if (!cause.reconstructed) {
    return { data: null, error: "This campaign isn't part of the recovery — nothing to claim." };
  }
  if (cause.recovered_owner_email?.toLowerCase() !== email.toLowerCase()) {
    return { data: null, error: "This campaign isn't linked to your account." };
  }

  const updated = await prisma.cause.update({
    where: { id: causeId },
    data: {
      userId,
      recovered_owner_email: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/causes");
  return { data: updated, error: null };
}
