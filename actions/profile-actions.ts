"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { isOwnUploadKey } from "@/lib/s3/owned-key";
import type {
  Profile,
  ProfileFormData,
  BankDetailsFormData,
  OnboardingProfileData,
} from "@/types";
import { KycStatus, KycVerification } from "@/types/kyc-types";
import { suggestUsername } from "@/utils/username";
import {
  formatOnboardingLocation,
  splitFullName,
  validateOnboardingDob,
} from "@/lib/onboarding/validation";

function createOnboardingOrgSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${base || "org"}-${suffix}`;
}

function mapPrismaToProfile(p: any): Profile {
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
  console.log("hasBankDetails check for user:", userId);
  console.log("Profile data found:", {
    exists: !!profile,
    account_number: profile?.account_number,
    bank_name: profile?.bank_name,
  });
  return !!(profile && profile.account_number && profile.bank_name);
}

export async function updateProfile(
  userId: string,
  profileData: ProfileFormData,
): Promise<Profile> {
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
    revalidatePath("/dashboard/settings/bank");
    return mapPrismaToProfile(data);
  } catch (error) {
    console.error("Error updating bank details:", error);
    throw error;
  }
}

export async function clearBankDetails(userId: string): Promise<Profile> {
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
  if (profileData.dateOfBirth && profileData.dateOfBirth.trim()) {
    const dobError = validateOnboardingDob(profileData.dateOfBirth);
    if (dobError) {
      throw new Error(dobError);
    }
  }

  const existingProfile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      profilePhoto: true,
      accountType: true,
      email: true,
      username: true,
      onboarding_completed: true,
    },
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

  const parsedName = splitFullName(
    profileData.fullName ||
      `${profileData.firstName ?? ""} ${profileData.lastName ?? ""}`,
  );
  const effectiveFirstName =
    profileData.firstName?.trim() || parsedName.firstName;
  const effectiveLastName = profileData.lastName?.trim() || parsedName.lastName;
  const effectiveFullName =
    parsedName.fullName ||
    `${effectiveFirstName} ${effectiveLastName}`.trim();

  const resolvedLocation = formatOnboardingLocation({
    city: profileData.city,
    state: profileData.state,
    country: profileData.country,
    fallbackLocation: profileData.location,
  });

  const effectiveEmail = profileData.email || existingProfile?.email || "";
  const resolvedUsername =
    profileData.username?.trim().toLowerCase() ||
    existingProfile?.username ||
    suggestUsername(effectiveEmail, effectiveFullName);

  const updateData: any = {
    // The wizard is completed explicitly on its final screen. Keeping this
    // false here prevents the onboarding guard from skipping KYC and success.
    onboarding_completed: false,
  };

  if (profileData.email) updateData.email = profileData.email;
  if (profileData.phone) updateData.phone = profileData.phone;
  if (effectiveFullName) updateData.fullName = effectiveFullName;
  if (profilePhotoUrl) updateData.profilePhoto = profilePhotoUrl;

  if (effectiveFirstName) updateData.firstName = effectiveFirstName;
  if (effectiveLastName) updateData.lastName = effectiveLastName;
  if (resolvedUsername) updateData.username = resolvedUsername;
  if (resolvedLocation) updateData.location = resolvedLocation;
  if (profileData.displayName !== undefined) {
    updateData.displayName = profileData.displayName.trim() || null;
  }
  if (profileData.accountType) {
    updateData.accountType = profileData.accountType;
  }
  if (profileData.gender) updateData.gender = profileData.gender;

  try {
    const data = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    if (
      profileData.accountType === "organization" &&
      profileData.organizationName?.trim() &&
      prisma.organization
    ) {
      const trimmedOrgName = profileData.organizationName.trim();
      const existingOrg = await prisma.organization.findFirst({
        where: { ownerId: userId },
      });

      const orgPreferences = {
        donationNotifications: true,
        teamDigest: true,
        publicProfile: true,
        ...(profileData.organizationRole?.trim()
          ? { ownerRole: profileData.organizationRole.trim() }
          : {}),
      };

      if (existingOrg) {
        await prisma.organization.update({
          where: { id: existingOrg.id },
          data: {
            name: trimmedOrgName,
            ...(profileData.organizationType?.trim()
              ? { industry: profileData.organizationType.trim() }
              : {}),
            ...(resolvedLocation ? { address: resolvedLocation } : {}),
            preferences: orgPreferences,
          },
        });
      } else {
        const createdOrg = await prisma.organization.create({
          data: {
            name: trimmedOrgName,
            slug: createOnboardingOrgSlug(trimmedOrgName),
            adminEmail: effectiveEmail.toLowerCase(),
            industry: profileData.organizationType?.trim() || null,
            address: resolvedLocation || null,
            ownerId: userId,
            preferences: orgPreferences,
          },
        });

        if (prisma.organizationMember) {
          await prisma.organizationMember.create({
            data: {
              organizationId: createdOrg.id,
              userId,
              role: "owner",
            },
          });
        }
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/");
    return data;
  } catch (error: any) {
    console.error("Error creating/updating profile:", error);
    throw new Error(`Failed to create profile: ${error.message}`);
  }
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
  try {
    const normalizedType =
      accountType === "organization" ? "organization" : accountType;

    await prisma.user.update({
      where: { id: userId },
      data: {
        accountType: normalizedType,
      },
    });

    revalidatePath("/onboarding");
  } catch (error) {
    console.error("Error in saveStep1Progress:", error);
    throw error;
  }
}

export async function saveStep2Progress(
  userId: string,
  gender: string,
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        gender: gender,
      },
    });

    revalidatePath("/onboarding");
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
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accountType: true,
      firstName: true,
      lastName: true,
      fullName: true,
      email: true,
      username: true,
      location: true,
      phone: true,
    },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  const parsedName = splitFullName(
    profile.fullName || `${profile.firstName ?? ""} ${profile.lastName ?? ""}`,
  );
  const effectiveFirstName = profile.firstName || parsedName.firstName;
  const effectiveLastName = profile.lastName || parsedName.lastName;

  const missingFields = [
    !profile.accountType && "account type",
    !effectiveFirstName && "first name",
    !effectiveLastName && "last name",
  ].filter(Boolean);

  if (missingFields.length > 0) {
    throw new Error(`Complete ${missingFields.join(", ")} before continuing`);
  }

  const updatePayload: Record<string, unknown> = {
    onboarding_completed: true,
  };

  if (!profile.firstName && effectiveFirstName) {
    updatePayload.firstName = effectiveFirstName;
  }
  if (!profile.lastName && effectiveLastName) {
    updatePayload.lastName = effectiveLastName;
  }
  if (!profile.username) {
    updatePayload.username = suggestUsername(
      profile.email,
      profile.fullName || `${effectiveFirstName} ${effectiveLastName}`,
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: updatePayload,
  });

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
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
