import { prisma } from "@/lib/prisma";

/**
 * Server-side helper to verify that a user has approved KYC and a complete
 * profile. Returns a redirect path string if the user fails a check, or
 * `null` if all requirements are met.
 *
 * Used by create-route layouts (causes, petitions) to gate access.
 */
export async function requireKycAndProfile(
  userId: string
): Promise<string | null> {
  // 1. Check KYC status via Prisma (fetch most recent)
  const kycVerification = await prisma.kyc_verifications.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  if (!kycVerification) {
    return "/dashboard/settings/kyc?error=kyc_required";
  }

  if (kycVerification.status !== "approved") {
    return `/dashboard/settings/kyc?error=kyc_${kycVerification.status}`;
  }

  // 2. Check profile completeness (fullName + profilePhoto)
  // Note: The model name is 'User' in Prisma, mapping to 'profiles' table.
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      profilePhoto: true,
    },
  });

  const hasFullName = !!(profile?.fullName && profile.fullName.trim() !== "");
  const hasPhoto = !!profile?.profilePhoto;

  if (!hasFullName || !hasPhoto) {
    return "/dashboard/settings/profile?error=profile_incomplete";
  }

  return null;
}
