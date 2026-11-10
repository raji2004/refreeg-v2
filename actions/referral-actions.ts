"use server";

import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth/auth";
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

// Short, human-shareable referral codes. The alphabet drops 0/O/1/I/L so a
// code read aloud or typed from a screenshot can't be misread. 8 chars from
// 31 symbols is ~850 billion combinations, so collisions are rare and the
// retry loop in ensureReferralCode handles the ones that still happen.
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

/**
 * The referral link carries User.referralCode, but nothing in the app ever
 * minted one — so most accounts fell back to their raw user id and produced
 * eye-wateringly long links. Mint a code once on first visit and persist it;
 * every later call reuses it. Old links that carry the user id keep working:
 * createReferralRecord resolves the referrer by code first, then by id.
 */
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
      // Unique-violation: someone else drew the same code — draw again.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      // Anything else (connectivity, etc.) — fall back to the user id rather
      // than failing the whole dashboard over a cosmetic code.
      break;
    }
  }

  return userId;
}

export async function getReferralDashboardData(): Promise<ReferralDashboardData | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

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
