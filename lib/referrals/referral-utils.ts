import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateReferralRecordParams {
  referralCode: string;

  newUserId: string;

  email: string;

  utmFields?: {
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    ip_address?: string | null;
    user_agent?: string | null;
  };
}

export interface CreateReferralRecordResult {
  created: boolean;
  referrerId?: string;
}

export async function createReferralRecord(
  params: CreateReferralRecordParams,
): Promise<CreateReferralRecordResult> {
  const { referralCode, newUserId, email, utmFields } = params;

  try {
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
      return { created: false };
    }

    if (referrer.id === newUserId) {
      return { created: false };
    }

    const existing = await prisma.referrals_v1.findFirst({
      where: {
        referrer_id_v1: referrer.id,
        referee_id_v1: newUserId,
      },
      select: { id_v1: true },
    });

    if (existing) {
      return { created: false, referrerId: referrer.id };
    }

    await prisma.referrals_v1.create({
      data: {
        referrer_id_v1: referrer.id,
        referee_id_v1: newUserId,
        referee_email_v1: email,
        registered_v1: true,
        reward_v1: null,
        reward_status_v1: "PENDING",
        kyc_verified_v1: false,

        utm_source_v1: utmFields?.utm_source ?? null,
        utm_medium_v1: utmFields?.utm_medium ?? null,
        utm_campaign_v1: utmFields?.utm_campaign ?? null,
        ip_address_v1: utmFields?.ip_address ?? null,
        user_agent_v1: utmFields?.user_agent ?? null,
      },
    });

    return { created: true, referrerId: referrer.id };
  } catch (error) {
    console.error(
      "[createReferralRecord] Failed to create referral record:",
      error,
    );
    return { created: false };
  }
}

type PendingReferralRow = {
  id_v1: string;
  referrer_id_v1: string;
};

export async function issueReferralRewardOnKycApproval(refereeUserId: string) {
  const referrals = await prisma.$queryRaw<PendingReferralRow[]>(Prisma.sql`
    SELECT id_v1, referrer_id_v1
    FROM referrals_v1
    WHERE referee_id_v1 = CAST(${refereeUserId} AS uuid)
      AND reward_status_v1 = 'PENDING'
    ORDER BY created_at_v1 DESC
    LIMIT 1
  `);

  const referral = referrals[0];
  if (!referral?.referrer_id_v1) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const lockedReferralCount = await tx.$executeRaw(Prisma.sql`
      UPDATE referrals_v1
      SET
        reward_status_v1 = 'ISSUED',
        kyc_verified_v1 = true,
        rewarded_at_v1 = NOW(),
        reward_v1 = '+5 pts'
      WHERE id_v1 = CAST(${referral.id_v1} AS uuid)
        AND reward_status_v1 = 'PENDING'
    `);

    if (lockedReferralCount === 0) {
      return;
    }

    await tx.user.update({
      where: { id: referral.referrer_id_v1 },
      data: {
        total_points: { increment: 5 },
      },
    });

    await tx.rewardTransaction.create({
      data: {
        userId: referral.referrer_id_v1,
        amount: 5,
        transactionType: "referral_bonus",
        status: "completed",
      },
    });
  });
}
