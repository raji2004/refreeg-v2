import { prisma } from "@/lib/prisma";

export const PROOF_MILESTONES = [25, 50, 75, 100] as const;
export const PROOF_GRACE_PERIOD_DAYS = 7;

/**
 * Idempotent sync: for every 25% threshold the cause has reached, ensure a
 * requirement row exists. Event-driven (called after raised changes), and
 * naturally grandfathers pre-existing crossings — no requirement is ever
 * created unless raised moves past a threshold while this code is live.
 */
export async function syncMilestoneRequirements(
  causeId: string,
): Promise<void> {
  const cause = await prisma.cause.findUnique({
    where: { id: causeId },
    select: {
      id: true,
      userId: true,
      title: true,
      raised: true,
      goal: true,
      user: { select: { email: true, fullName: true } },
    },
  });
  if (!cause || !cause.goal || Number(cause.goal) <= 0) return;

  const percent = (Number(cause.raised) / Number(cause.goal)) * 100;
  const crossed = PROOF_MILESTONES.filter((m) => percent >= m);
  if (crossed.length === 0) return;

  const deadline = new Date(
    Date.now() + PROOF_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );

  // skipDuplicates guards against concurrent webhooks racing on the same threshold
  const result = await prisma.campaign_proof_requirements.createMany({
    data: crossed.map((milestone) => ({
      cause_id: causeId,
      milestone,
      deadline,
    })),
    skipDuplicates: true,
  });

  if (result.count === 0) return; // nothing newly crossed

  // One consolidated email listing every newly-required milestone
  const { sendProofUpdateRequiredEmail } = await import("@/services/mail");
  try {
    await sendProofUpdateRequiredEmail({
      to: cause.user?.email ?? "",
      userName: cause.user?.fullName ?? "there",
      causeTitle: cause.title,
      causeUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com"}/causes/${causeId}`,
      milestones: crossed,
      deadline: deadline.toDateString(),
    });
  } catch (e) {
    console.error("Failed to send proof-update-required email:", e);
  }
}

/**
 * Guard for donation entry points. Throws when a cause is paused for
 * compliance, so no new money can come in.
 */
export async function assertCauseAcceptingDonations(
  causeId: string,
): Promise<void> {
  const cause = await prisma.cause.findUnique({
    where: { id: causeId },
    select: { compliance_paused: true },
  });
  if (cause?.compliance_paused) {
    throw new Error(
      "This campaign is not currently accepting donations. The organizer needs to post a fund-use update.",
    );
  }
}
