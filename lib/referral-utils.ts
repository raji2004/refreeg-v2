/**
 * lib/referral-utils.ts
 *
 * Shared utility for creating referrals_v1 records.
 * Used by:
 *   - /api/auth/verify-otp (email/OTP signup path)
 *   - /lib/auth/auth.ts   (Google OAuth path via signIn event)
 *
 * Keeping the logic in one place ensures both auth paths behave identically.
 */

import { prisma } from "@/lib/prisma";

export interface CreateReferralRecordParams {
  /** The referral code from the URL (?ref_v1=CODE) */
  referralCode: string;
  /** The newly created user's ID */
  newUserId: string;
  /** The newly created user's email */
  email: string;
  /** Optional UTM and device fields — only available for email/OTP signups */
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

/**
 * Looks up the referrer by referral code and creates a referrals_v1 row
 * linking them to the newly registered user.
 *
 * Safe to call from both OTP and OAuth paths:
 * - Idempotent: will not create a duplicate if called twice for the same pair.
 * - Non-throwing: errors are caught and logged; returns { created: false } on failure.
 * - Self-referral safe: if referralCode resolves to the same user as newUserId, skipped.
 */
export async function createReferralRecord(
  params: CreateReferralRecordParams,
): Promise<CreateReferralRecordResult> {
  const { referralCode, newUserId, email, utmFields } = params;

  try {
    // Look up referrer by their referralCode field.
    // Fallback: some older accounts may use their userId as a referral code.
    let referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      // Fallback: try interpreting the code as a raw user ID
      referrer = await prisma.user.findUnique({
        where: { id: referralCode },
        select: { id: true },
      });
    }

    if (!referrer) {
      // Unknown referral code — silently skip, not an error
      return { created: false };
    }

    // Self-referral guard: the new user cannot refer themselves
    if (referrer.id === newUserId) {
      return { created: false };
    }

    // Idempotency: skip if a record already exists for this referrer + referee pair
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
        // UTM fields — populated for OTP signups, null for OAuth (no URL params available post-redirect)
        utm_source_v1: utmFields?.utm_source ?? null,
        utm_medium_v1: utmFields?.utm_medium ?? null,
        utm_campaign_v1: utmFields?.utm_campaign ?? null,
        ip_address_v1: utmFields?.ip_address ?? null,
        user_agent_v1: utmFields?.user_agent ?? null,
      },
    });

    return { created: true, referrerId: referrer.id };
  } catch (error) {
    console.error("[createReferralRecord] Failed to create referral record:", error);
    return { created: false };
  }
}
