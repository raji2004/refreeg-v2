import { prisma } from "@/lib/prisma";

export async function requireKycAndProfile(
  userId: string,
): Promise<string | null> {
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
