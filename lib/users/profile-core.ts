// Profile & onboarding domain core. Deliberately NOT a "use server" module:
// every export of a "use server" file is reachable as an unauthenticated RPC
// endpoint, so browser callers go through `actions/users/profile-actions.ts`
// (which enforces `assertSelf`), while authenticated mobile JWT routes under
// `app/api/mobile/*` call these core helpers directly after `authenticateMobileRequest`.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  fetchBreetBanks,
  resolveBreetBankId,
  validateBreetBankAccount,
} from "@/lib/payments/breet";
import type {
  Profile,
  ProfileFormData,
  BankDetailsFormData,
  OnboardingProfileData,
} from "@/types";
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

export async function updateProfileCore(
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

export async function updateBankDetailsCore(
  userId: string,
  bankData: BankDetailsFormData,
): Promise<Profile> {
  if (
    process.env.BREET_APP_ID &&
    process.env.BREET_APP_SECRET &&
    bankData.accountNumber &&
    bankData.bankName
  ) {
    const banks = await fetchBreetBanks().catch(() => []);
    const breetBankId = resolveBreetBankId(bankData.bankName, banks);
    if (breetBankId) {
      const validation = await validateBreetBankAccount(
        breetBankId,
        bankData.accountNumber,
      );
      if (validation.status === "invalid") {
        throw new Error(
          "We could not verify this bank account with our settlement provider. Please double-check the bank and account number.",
        );
      }
    }
  }
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

export async function createOnboardingProfileCore(
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
  if (profileData.bio !== undefined) {
    updateData.bio = profileData.bio.trim() || null;
  }
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

export async function saveStep1ProgressCore(
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

export async function saveStep2ProgressCore(
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

export async function completeOnboardingCore(userId: string): Promise<void> {
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
