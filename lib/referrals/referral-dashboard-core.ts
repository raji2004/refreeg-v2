// Referral dashboard core. Deliberately NOT a "use server" module so
// `actions/users/referral-actions.ts` enforces NextAuth session ownership for
// browser callers, while `/api/mobile/referrals` calls this directly after
// validating the mobile Bearer JWT.

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ReferralRow = {
  id: string;
  referrer_id?: string | null;
  referee_id?: string | null;
  registered: boolean | null;
  referee_email: string | null;
  created_at: string | null;
  reward?: string | null;
  reward_status?: string | null;
  profiles?: {
    first_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export type ReferralDashboardData = {
  referralLink: string;
  points: number;
  invites: number;
  signUps: number;
  tier: string;
  referrals: ReferralRow[];
};

const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REFERRAL_CODE_LENGTH = 8;

function generateReferralCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
  }
  return code;
}

async function ensureReferralCode(
  userId: string,
  existing: string | null,
): Promise<string> {
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      return code;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      break;
    }
  }

  return userId;
}

export async function getReferralDashboardDataCore(
  userId: string,
): Promise<ReferralDashboardData> {
  const [profile, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
      },
    }),
    prisma.referrals_v1.findMany({
      where: { referrer_id_v1: userId },
      orderBy: { created_at_v1: "desc" },
      select: {
        id_v1: true,
        referrer_id_v1: true,
        referee_id_v1: true,
        referee_email_v1: true,
        registered_v1: true,
        reward_v1: true,
        created_at_v1: true,
        reward_status_v1: true,
      },
    }),
  ]);

  const refereeIds = rows
    .map((row) => row.referee_id_v1)
    .filter((id): id is string => Boolean(id));

  const referredProfiles = refereeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: refereeIds } },
        select: {
          id: true,
          firstName: true,
          email: true,
        },
      })
    : [];

  const profileMap = new Map(
    referredProfiles.map((referredProfile) => [
      referredProfile.id,
      {
        first_name: referredProfile.firstName ?? null,
        email: referredProfile.email ?? null,
        avatar_url: null,
      },
    ]),
  );

  const referrals = rows.map((row) => ({
    id: row.id_v1,
    referrer_id: row.referrer_id_v1,
    referee_id: row.referee_id_v1,
    registered: row.registered_v1,
    referee_email: row.referee_email_v1,
    created_at: row.created_at_v1?.toISOString() ?? null,
    reward: row.reward_v1,
    profiles: row.referee_id_v1
      ? (profileMap.get(row.referee_id_v1) ?? null)
      : null,
    reward_status: row.reward_status_v1,
  }));

  const rewardedReferrals = referrals.filter(
    (row) => row.reward_status === "ISSUED",
  ).length;

  const signUps = referrals.filter((row) => row.registered).length;
  const points = rewardedReferrals * 5;
  const referralCode = await ensureReferralCode(
    userId,
    profile?.referralCode ?? null,
  );
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL?.replace(/\/api\/auth$/, "") ||
    "";

  let tier = "Tier 1";
  if (points >= 505) {
    tier = "Tier 3";
  } else if (points >= 205) {
    tier = "Tier 2";
  }

  return {
    referralLink: `${baseUrl}/auth/signup?ref_v1=${referralCode}`,
    points,
    invites: referrals.length,
    signUps,
    tier,
    referrals,
  };
}
