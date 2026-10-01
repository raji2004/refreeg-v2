import "server-only";

import { prisma } from "@/lib/prisma";
import type { Profile } from "@/types";

export function mapPrismaToProfile(p: any): Profile {
  return {
    id: p.id,
    email: p.email,
    full_name: p.fullName,
    first_name: p.firstName,
    last_name: p.lastName,
    username: p.username,
    display_name: p.displayName ?? null,
    phone: p.phone,
    location: p.location,
    donation_preference: p.donationPreference ?? "named",
    account_number: p.accountNumber,
    bank_name: p.bankName,
    account_name: p.accountName,
    sub_account_code: p.subAccountCode,
    flutterwave_sub_account_id: p.flutterwaveSubAccountId || null,
    profile_photo: p.profilePhoto,
    is_blocked: p.isBlocked ?? false,
    referral_code: p.referralCode || null,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt?.toISOString() || new Date().toISOString(),
    account_type: p.accountType as any,
    is_verified: p.isVerified ?? false,
    total_points: p.total_points ?? 0,
    interests: p.interests ?? [],
    gender: p.gender,
    bio: p.bio,
    twitter_url: p.twitter_url,
    facebook_url: p.facebook_url,
    instagram_url: p.instagram_url,
    linkedin_url: p.linkedin_url,
    crypto_wallets: p.crypto_wallets ?? null,
  } as Profile;
}

// Trusted server code only (pages, emails, other actions). Not a server
// action, so the browser can't call it with someone else's id.
export async function getProfileById(userId: string): Promise<Profile | null> {
  // A Prisma `_count` include makes Postgres GROUP BY the whole causes and
  // donations tables on every profile read; a filtered count uses the
  // user_id index instead.
  const [profile, donationCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      omit: { password: true },
    }),
    prisma.donation.count({ where: { userId } }),
  ]);

  if (!profile) return null;

  const mapped = mapPrismaToProfile(profile);
  mapped.causes_count = donationCount;
  return mapped;
}

export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  try {
    const profile = await prisma.user.findUnique({
      where: { username },
      omit: { password: true },
    });

    return profile ? mapPrismaToProfile(profile) : null;
  } catch (error) {
    console.error("Error in getProfileByUsername:", error);
    return null;
  }
}
