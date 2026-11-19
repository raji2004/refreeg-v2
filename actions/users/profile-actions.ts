"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import {
  completeOnboardingCore,
  createOnboardingProfileCore,
  mapPrismaToProfile,
  saveStep1ProgressCore,
  saveStep2ProgressCore,
  updateBankDetailsCore,
  updateProfileCore,
} from "@/lib/users/profile-core";
import type {
  Profile,
  ProfileFormData,
  BankDetailsFormData,
  OnboardingProfileData,
} from "@/types";
import { KycStatus, KycVerification } from "@/types/kyc-types";

// Server actions are reachable as unauthenticated RPC by anyone with the
// bundle, so every mutation must re-derive the actor from the session and
// refuse to touch a profile the caller does not own.
async function assertSelf(userId: string): Promise<void> {
  const session = await auth();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    throw new Error("You need to be signed in.");
  }
  if (userId !== sessionUserId) {
    throw new Error("You can only manage your own profile.");
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    // A Prisma `_count` include makes Postgres GROUP BY the whole causes and
    // donations tables on every profile read; a filtered count uses the
    // user_id index instead.
    const [profile, distinctCauses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        omit: { password: true },
      }),
      prisma.donation.groupBy({
        by: ["causeId"],
        where: { userId, status: "successful" },
      }),
    ]);

    if (!profile) return null;

    const mapped = mapPrismaToProfile(profile);
    mapped.causes_count = distinctCauses.length;
    return mapped;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
}

export async function hasBankDetails(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  return !!(profile && profile.account_number && profile.bank_name);
}

export async function updateProfile(
  userId: string,
  profileData: ProfileFormData,
): Promise<Profile> {
  await assertSelf(userId);
  return updateProfileCore(userId, profileData);
}

// The file goes browser → S3 directly; only the key comes through here.
export async function setProfilePhoto(s3Key: string): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("You need to be signed in.");
  if (!isOwnUploadKey(s3Key, "profiles", userId)) {
    throw new Error("Invalid photo upload.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { profilePhoto: s3Key },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/");
  return s3Key;
}

export async function updateBankDetails(
  userId: string,
  bankData: BankDetailsFormData,
): Promise<Profile> {
  await assertSelf(userId);
  return updateBankDetailsCore(userId, bankData);
}

export async function clearBankDetails(userId: string): Promise<Profile> {
  await assertSelf(userId);
  try {
    const data = await prisma.user.update({
      where: { id: userId },
      data: {
        accountNumber: null,
        bankName: null,
        accountName: null,
        subAccountCode: null,
        flutterwaveSubAccountId: null,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/bank");
    return mapPrismaToProfile(data);
  } catch (error) {
    console.error("Error clearing bank details:", error);
    throw error;
  }
}

export async function createOnboardingProfile(
  userId: string,
  profileData: OnboardingProfileData,
  oauthAvatarUrl?: string | null,
): Promise<any> {
  await assertSelf(userId);
  return createOnboardingProfileCore(userId, profileData, oauthAvatarUrl);
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        bio: true,
        location: true,
        createdAt: true,
        onboarding_completed: true,
      },
    });

    if (!profile) {
      return false;
    }

    if (profile.onboarding_completed === true) {
      return true;
    }

    // Preserve access for legacy accounts that predate the onboarding wizard.
    return new Date(profile.createdAt) < new Date("2024-12-21");
  } catch (error) {
    console.error("Error checking onboarding completion:", error);
    return false;
  }
}

export async function getCurrentOnboardingStep(
  userId: string,
): Promise<number> {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountType: true,
        gender: true,
        firstName: true,
        lastName: true,
        username: true,
        bio: true,
        location: true,
        phone: true,
        email: true,
        profilePhoto: true,
      },
    });

    if (!profile) {
      return 1;
    }

    if (!profile.accountType) {
      return 1;
    }

    const hasProfileData = !!(
      profile.firstName &&
      profile.lastName &&
      profile.username
    );

    if (!hasProfileData) {
      if (profile.accountType !== "organization" && !profile.gender) {
        return 2;
      }
      return 3;
    }

    // For organization accounts, check if org setup is complete (Step 3B)
    if (profile.accountType === "organization" && prisma.organization) {
      const org = await prisma.organization.findFirst({
        where: { ownerId: userId },
        select: { logoUrl: true, preferences: true },
      });
      const prefs = org?.preferences as Record<string, unknown> | null;
      const hasVisitedOrgSetup = prefs && Object.keys(prefs).length > 0;
      if (!hasVisitedOrgSetup) {
        // Return a special value: the orchestrator maps this to step 3B
        return 3.5;
      }
    }

    return 4;
  } catch (error) {
    console.error("Error determining onboarding step:", error);
    return 1;
  }
}

export async function getOnboardingData(userId: string): Promise<{
  accountType: string;
  gender: string;
  profile: {
    firstName: string;
    lastName: string;
    fullName?: string;
    displayName?: string;
    username: string;
    bio?: string;
    location: string;
    phone: string;
    email: string;
    profilePhoto?: string;
  };
}> {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        accountType: true,
        gender: true,
        firstName: true,
        lastName: true,
        fullName: true,
        displayName: true,
        username: true,
        bio: true,
        location: true,
        phone: true,
        email: true,
        profilePhoto: true,
      },
    });

    if (!profile) {
      return {
        accountType: "",
        gender: "",
        profile: {
          firstName: "",
          lastName: "",
          fullName: "",
          displayName: "",
          username: "",
          bio: "",
          location: "",
          phone: "",
          email: "",
        },
      };
    }

    return {
      accountType: profile.accountType || "",
      gender: profile.gender || "",
      profile: {
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        fullName: profile.fullName || "",
        displayName: profile.displayName || "",
        username: profile.username || "",
        bio: profile.bio || "",
        location: profile.location || "",
        phone: profile.phone || "",
        email: profile.email || "",
        profilePhoto: profile.profilePhoto || undefined,
      },
    };
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    return {
      accountType: "",
      gender: "",
      profile: {
        firstName: "",
        lastName: "",
        fullName: "",
        displayName: "",
        username: "",
        location: "",
        phone: "",
        email: "",
      },
    };
  }
}

export async function saveStep1Progress(
  userId: string,
  accountType: string,
): Promise<void> {
  await assertSelf(userId);
  return saveStep1ProgressCore(userId, accountType);
}

export async function saveStep2Progress(
  userId: string,
  gender: string,
): Promise<void> {
  await assertSelf(userId);
  return saveStep2ProgressCore(userId, gender);
}

export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string,
): Promise<boolean> {
  try {
    // Normalise to lowercase to prevent case-sensitivity false conflicts
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || normalizedUsername.length < 3) {
      return true; // Too short to check: let field validation handle it
    }

    const profile = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      select: { id: true },
    });

    // No match → available
    if (!profile) return true;

    // Match is the current user's own row → available for them
    if (currentUserId && profile.id === currentUserId) return true;

    // Taken by someone else
    return false;
  } catch (error) {
    console.error("Error checking username availability:", error);
    return false; // Safely return false if an error occurs
  }
}

/**
 * Fetch the organization onboarding data for the owner to pre-fill Step 3B.
 */
export async function getOrganizationOnboardingData(userId: string) {
  try {
    const org = await prisma.organization.findFirst({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        industry: true,
        logoUrl: true,
        bio: true,
        websiteUrl: true,
        instagramUrl: true,
        twitterUrl: true,
        tiktokUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        preferences: true,
      },
    });

    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      phone: org.phone || "",
      address: org.address || "",
      industry: org.industry || "",
      logoUrl: org.logoUrl || "",
      bio: org.bio || "",
      websiteUrl: org.websiteUrl || "",
      instagramUrl: org.instagramUrl || "",
      twitterUrl: org.twitterUrl || "",
      tiktokUrl: org.tiktokUrl || "",
      facebookUrl: org.facebookUrl || "",
      whatsappNumber: org.whatsappNumber || "",
      preferences: (org.preferences || {}) as Record<string, boolean>,
    };
  } catch (error) {
    console.error("Error fetching organization onboarding data:", error);
    return null;
  }
}

export async function completeOnboarding(userId: string): Promise<void> {
  await assertSelf(userId);
  return completeOnboardingCore(userId);
}

export async function isProfileComplete(
  userId: string,
): Promise<{ isComplete: boolean; missingFields: string[] }> {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, profilePhoto: true },
    });

    if (!profile) {
      return { isComplete: false, missingFields: ["profile"] };
    }

    const missingFields: string[] = [];

    if (!profile.fullName || profile.fullName.trim() === "") {
      missingFields.push("full name");
    }

    if (!profile.profilePhoto) {
      missingFields.push("profile picture");
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  } catch (error) {
    console.error("Error in isProfileComplete:", error);
    return { isComplete: false, missingFields: ["profile"] };
  }
}

export async function hasKycVerification(
  userId: string,
): Promise<KycVerification | null> {
  try {
    const data = await prisma.kyc_verifications.findFirst({
      where: { user_id: userId },
    });

    if (!data) return null;

    if (
      data.document_url &&
      !data.document_url.startsWith("http") &&
      !data.document_url.startsWith("/api/s3/image")
    ) {
      (data as any).document_url =
        `/api/s3/image?key=${encodeURIComponent(data.document_url)}`;
    }

    return data as unknown as KycVerification;
  } catch (error) {
    console.error("Error in hasKycVerification:", error);
    return null;
  }
}

export async function updateKycStatus(
  verificationId: string,
  status: KycStatus,
  notes?: string,
) {
  try {
    const data = await prisma.kyc_verifications.update({
      where: { id: verificationId },
      data: {
        status,
        verification_notes: notes ?? null,
        updated_at: new Date(),
      },
    });

    return data;
  } catch (error) {
    console.error("Error in updateKycStatus:", error);
    throw error;
  }
}

// 👇 REMOVED: getSolanaWallet, updateSolanaWallet, getPolygonWallet, updatePolygonWallet

export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  try {
    const profile = await prisma.user.findUnique({
      where: { username },
    });

    if (!profile) return null;

    return mapPrismaToProfile(profile);
  } catch (error) {
    console.error("Error in getProfileByUsername:", error);
    return null;
  }
}
