"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface RecordDonorReferralParams {
  donationId: string;
  causeId: string;
  referralCode: string;
  donorEmail: string;
  donorUserId?: string | null;
}

export interface RecordDonorReferralResult {
  recorded: boolean;
  status?: "confirmed" | "self_referral" | "own_campaign";
  referrerId?: string;
  reason?: string;
}

/**
 * Records referral attribution for a completed donation.
 * Idempotent on donationId. Non-fatal (catches all errors).
 */
export async function recordDonorReferralAttribution(
  params: RecordDonorReferralParams,
): Promise<RecordDonorReferralResult> {
  const { donationId, causeId, referralCode, donorEmail, donorUserId } = params;

  if (!donationId || !causeId || !referralCode || !donorEmail) {
    return { recorded: false, reason: "missing_required_params" };
  }

  try {
    // 1. Idempotency check on donation_id
    const existing = await (prisma as any).donorReferralAttribution.findUnique({
      where: { donation_id: donationId },
      select: { id: true, status: true, referrer_id: true },
    });

    if (existing) {
      return {
        recorded: true,
        status: existing.status as any,
        referrerId: existing.referrer_id,
      };
    }

    // 2. Lookup referrer by referralCode, fallback to user id
    let referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      referrer = await prisma.user.findUnique({
        where: { id: referralCode },
        select: { id: true },
      });
    }

    if (!referrer) {
      return { recorded: false, reason: "referrer_not_found" };
    }

    // 3. Determine status (self-referral vs own-campaign vs confirmed)
    let status: "confirmed" | "self_referral" | "own_campaign" = "confirmed";

    if (donorUserId && donorUserId === referrer.id) {
      status = "self_referral";
    } else {
      const cause = await prisma.cause.findUnique({
        where: { id: causeId },
        select: { userId: true },
      });

      if (donorUserId && cause?.userId && cause.userId === donorUserId) {
        status = "own_campaign";
      }
    }

    // 4. Create attribution record
    await (prisma as any).donorReferralAttribution.create({
      data: {
        referrer_id: referrer.id,
        donation_id: donationId,
        cause_id: causeId,
        donor_email: donorEmail.toLowerCase().trim(),
        donor_user_id: donorUserId || null,
        referral_code: referralCode,
        status,
      },
    });

    // 5. Backfill referrer_id on the donation table if possible
    await (prisma as any).donation
      .update({
        where: { id: donationId },
        data: { referrer_id: referrer.id },
      })
      .catch((err: any) => {
        console.warn(
          "[recordDonorReferralAttribution] Non-fatal error updating donation.referrer_id:",
          err?.message,
        );
      });

    // 6. Revalidate leaderboard paths if confirmed
    if (status === "confirmed") {
      try {
        revalidatePath("/leaderboard");
        revalidatePath(`/leaderboard/${referrer.id}`);
      } catch (revalErr) {
        // Ignored in non-page contexts
      }
    }

    return {
      recorded: true,
      status,
      referrerId: referrer.id,
    };
  } catch (error: any) {
    console.error(
      "[recordDonorReferralAttribution] Failed to record attribution:",
      error,
    );
    return { recorded: false, reason: error.message || "internal_error" };
  }
}
