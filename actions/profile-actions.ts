"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import type {
  Profile,
  ProfileFormData,
  BankDetailsFormData,
  OnboardingProfileData,
} from "@/types";
import { KycStatus, KycVerification } from "@/types/kyc-types";
import {
  requireAdminOrManager,
  requireSelfOrStaff,
} from "@/lib/auth/admin-auth";
import { getProfileById, mapPrismaToProfile } from "@/lib/profile/get-profile";

export async function getProfile(userId: string): Promise<Profile | null> {
  await requireSelfOrStaff(userId);
  return getProfileById(userId);
}

export async function hasBankDetails(userId: string): Promise<boolean> {
  await requireSelfOrStaff(userId);
  const profile = await getProfileById(userId);
  return !!(profile && profile.account_number && profile.bank_name);
}

export async function updateProfile(
  userId: string,
  profileData: ProfileFormData,
): Promise<Profile> {
  await requireSelfOrStaff(userId);
  try {
    const data = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: profileData.name,
        email: profileData.email,
        username: profileData.username,
        phone: profileData.phone || null,
        bio: profileData.bio,
        location: profileData.location || null,
        displayName: profileData.display_name || null,
        donationPreference: profileData.donation_preference || "named",
        ...(profileData.interests !== undefined
          ? { interests: profileData.interests }
          : {}),
        ...(profileData.account_type !== undefined
          ? { accountType: profileData.account_type }
          : {}),
        ...(profileData.profile_photo !== undefined
          ? { profilePhoto: profileData.profile_photo }
          : {}),
        ...(profileData.twitter_url !== undefined
          ? { twitter_url: profileData.twitter_url || null }
          : {}),
        ...(profileData.facebook_url !== undefined
          ? { facebook_url: profileData.facebook_url || null }
          : {}),
        ...(profileData.instagram_url !== undefined
          ? { instagram_url: profileData.instagram_url || null }
          : {}),
        ...(profileData.linkedin_url !== undefined
          ? { linkedin_url: profileData.linkedin_url || null }
          : {}),
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/profile");
    revalidatePath(`/profile/${userId}`);
    revalidatePath("/");

    return mapPrismaToProfile(data);
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

export async function updateProfilePhoto(
  userId: string,
  photoFile: File,
): Promise<string> {
  await requireSelfOrStaff(userId);
  const ext = photoFile.name.split(".").pop() || "jpg";
  const uniqueId = Math.random().toString(36).substring(2, 15);
  try {
    const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
    const s3Key = generateS3Key({
      entityType: "profiles",
      userId,
      entityId: userId,
      mediaType: "images",
      filename: `${uniqueId}.${ext}`,
    });
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    await uploadToS3(buffer, s3Key, photoFile.type);

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: s3Key },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/");
    return s3Key;
  } catch (error: any) {
    console.error("Error updating profile photo:", error);
    throw error;
  }
}

export async function updateBankDetails(
  userId: string,
  bankData: BankDetailsFormData,
): Promise<Profile> {
  await requireSelfOrStaff(userId);
  try {
    const data = await prisma.user.update({
      where: { id: userId },
      data: {
        accountNumber: bankData.accountNumber,
        bankName: bankData.bankName,
        accountName: bankData.accountName,
        subAccountCode: bankData.sub_account_code,
        ...(bankData.flutterwave_sub_account_id
          ? { flutterwaveSubAccountId: bankData.flutterwave_sub_account_id }
          : {}),
      },
    });

    revalidatePath("/dashboard/settings");
    return mapPrismaToProfile(data);
  } catch (error) {
    console.error("Error updating bank details:", error);
    throw error;
  }
}

export async function createOnboardingProfile(
  userId: string,
  profileData: OnboardingProfileData,
  oauthAvatarUrl?: string | null,
): Promise<any> {
  await requireSelfOrStaff(userId);
  const existingProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhoto: true, accountType: true },
  });

  let profilePhotoUrl: string | null = existingProfile?.profilePhoto ?? null;

  if (profileData.profilePhoto) {
    const ext = profileData.profilePhoto.name.split(".").pop() || "jpg";
    const uniqueId = Math.random().toString(36).substring(2, 15);
    try {
      const { uploadToS3, generateS3Key } = await import("@/lib/s3/s3-utils");
      const s3Key = generateS3Key({
        entityType: "profiles",
        userId,
        entityId: userId,
        mediaType: "images",
        filename: `${uniqueId}.${ext}`,
      });
      const buffer = Buffer.from(await profileData.profilePhoto.arrayBuffer());
      await uploadToS3(buffer, s3Key, profileData.profilePhoto.type);
      profilePhotoUrl = s3Key;
    } catch (uploadError) {
      console.error("Error uploading profile photo:", uploadError);
      throw new Error("Failed to upload profile photo");
    }
  } else if (!profilePhotoUrl && oauthAvatarUrl) {
    profilePhotoUrl = oauthAvatarUrl;
  }

  const fullName = `${profileData.firstName ?? ""} ${
    profileData.lastName ?? ""
  }`.trim();

  const updateData: any = {
    // The wizard is completed explicitly on its final screen. Keeping this
    // false here prevents the onboarding guard from skipping KYC and success.
    onboarding_completed: false,
  };

  if (profileData.email) updateData.email = profileData.email;
  if (profileData.phone) updateData.phone = profileData.phone;
  if (fullName) updateData.fullName = fullName;
  if (profilePhotoUrl) updateData.profilePhoto = profilePhotoUrl;

  if (profileData.firstName) updateData.firstName = profileData.firstName;
  if (profileData.lastName) updateData.lastName = profileData.lastName;
  if (profileData.username) updateData.username = profileData.username;
  if (profileData.location) updateData.location = profileData.location;
  if (profileData.accountType) {
    updateData.accountType =
      existingProfile?.accountType === "individual"
        ? "individual"
        : profileData.accountType;
  }
  if (profileData.gender) updateData.gender = profileData.gender;

  try {
    const data = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return data;
  } catch (error: any) {
    console.error("Error creating/updating profile:", error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }
}

const ONBOARDING_SELECT = {
  accountType: true,
  gender: true,
  firstName: true,
  lastName: true,
  username: true,
  location: true,
  phone: true,
  email: true,
  profilePhoto: true,
  createdAt: true,
  onboarding_completed: true,
} as const;

type OnboardingRow = {
  accountType: string | null;
  gender: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  profilePhoto: string | null;
  createdAt: Date;
  onboarding_completed: boolean | null;
};

export type OnboardingData = {
  accountType: string;
  gender: string;
  profile: {
    firstName: string;
    lastName: string;
    username: string;
    location: string;
    phone: string;
    email: string;
    profilePhoto?: string;
  };
};

function loadOnboardingRow(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: ONBOARDING_SELECT,
  }) as Promise<OnboardingRow | null>;
}

function isOnboardingDone(profile: OnboardingRow | null): boolean {
  if (!profile) return false;
  if (profile.onboarding_completed === true) return true;
  // Preserve access for legacy accounts that predate the onboarding wizard.
  return new Date(profile.createdAt) < new Date("2024-12-21");
}

async function onboardingStepFor(
  userId: string,
  profile: OnboardingRow | null,
): Promise<number> {
  if (!profile?.accountType) return 1;

  if (profile.accountType !== "organization" && !profile.gender) return 2;

  const hasProfileData = !!(
    profile.firstName &&
    profile.lastName &&
    profile.username &&
    profile.location &&
    profile.phone &&
    profile.email
  );
  if (!hasProfileData) return 3;

  if (profile.accountType === "organization") {
    const org = await prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { preferences: true },
    });
    // Preferences stay "{}" until the owner has been through org setup (3B).
    const prefs = org?.preferences as Record<string, unknown> | null;
    if (!prefs || Object.keys(prefs).length === 0) return 3.5;
  }

  return 4;
}

function onboardingDataFrom(profile: OnboardingRow | null): OnboardingData {
  return {
    accountType: profile?.accountType || "",
    gender: profile?.gender || "",
    profile: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      username: profile?.username || "",
      location: profile?.location || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      profilePhoto: profile?.profilePhoto || undefined,
    },
  };
}

// Everything the onboarding page needs on load, for the signed-in user, in
// one round trip.
export async function getOnboardingState(): Promise<{
  completed: boolean;
  step: number;
  data: OnboardingData;
} | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const profile = await loadOnboardingRow(userId);
  if (isOnboardingDone(profile)) {
    return { completed: true, step: 4, data: onboardingDataFrom(profile) };
  }

  return {
    completed: false,
    step: await onboardingStepFor(userId, profile),
    data: onboardingDataFrom(profile),
  };
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  await requireSelfOrStaff(userId);
  try {
    return isOnboardingDone(await loadOnboardingRow(userId));
  } catch (error) {
    console.error("Error checking onboarding completion:", error);
    return false;
  }
}

export async function getCurrentOnboardingStep(
  userId: string,
): Promise<number> {
  await requireSelfOrStaff(userId);
  try {
    return await onboardingStepFor(userId, await loadOnboardingRow(userId));
  } catch (error) {
    console.error("Error determining onboarding step:", error);
    return 1;
  }
}

export async function getOnboardingData(
  userId: string,
): Promise<OnboardingData> {
  await requireSelfOrStaff(userId);
  try {
    return onboardingDataFrom(await loadOnboardingRow(userId));
  } catch (error) {
    console.error("Error fetching onboarding data:", error);
    return onboardingDataFrom(null);
  }
}

export async function saveStep1Progress(
  userId: string,
  accountType: string,
): Promise<void> {
  await requireSelfOrStaff(userId);
  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    });

    if (
      existing?.accountType === "individual" &&
      accountType === "organization"
    ) {
      throw new Error(
        "Individual accounts cannot be converted to organization accounts.",
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        accountType:
          existing?.accountType === "organization"
            ? "organization"
            : accountType,
      },
    });
  } catch (error) {
    console.error("Error in saveStep1Progress:", error);
    throw error;
  }
}

export async function saveStep2Progress(
  userId: string,
  gender: string,
): Promise<void> {
  await requireSelfOrStaff(userId);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gender: gender,
      },
    });
  } catch (error) {
    console.error("Error in saveStep2Progress:", error);
    throw error;
  }
}

export async function checkUsernameAvailability(
  username: string,
  currentUserId?: string,
): Promise<boolean> {
  try {
    // Normalise to lowercase to prevent case-sensitivity false conflicts
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || normalizedUsername.length < 3) {
      return true; // Too short to check — let field validation handle it
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
  await requireSelfOrStaff(userId);
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
  await requireSelfOrStaff(userId);
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      firstName: true,
      lastName: true,
      username: true,
      location: true,
      phone: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  const missingFields = [
    !profile.accountType && "account type",
    !profile.firstName && "first name",
    !profile.lastName && "last name",
    !profile.username && "username",
    !profile.location && "location",
    !profile.phone && "phone number",
  ].filter(Boolean);

  if (missingFields.length > 0) {
    throw new Error(`Complete ${missingFields.join(", ")} before continuing`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { onboarding_completed: true },
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
}

export async function isProfileComplete(
  userId: string,
): Promise<{ isComplete: boolean; missingFields: string[] }> {
  await requireSelfOrStaff(userId);
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
  await requireSelfOrStaff(userId);
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
  await requireAdminOrManager();
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
