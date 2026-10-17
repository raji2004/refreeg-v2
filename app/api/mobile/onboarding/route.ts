import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  getOnboardingData,
  getCurrentOnboardingStep,
  createOnboardingProfile,
  checkUsernameAvailability,
} from "@/actions/profile-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const [onboardingData, currentStep, userRecord] = await Promise.all([
      getOnboardingData(user!.id),
      getCurrentOnboardingStep(user!.id),
      prisma.user.findUnique({
        where: { id: user!.id },
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
          interests: true,
          onboarding_completed: true,
        },
      }),
    ]);

    return apiSuccess({
      data: onboardingData,
      currentStep,
      onboardingCompleted: userRecord?.onboarding_completed ?? false,
      accountType: userRecord?.accountType ?? "individual",
      interests: userRecord?.interests ?? [],
    });
  } catch (error: any) {
    console.error("Mobile API Get Onboarding Data Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { profileData, oauthAvatarUrl } = body;

    if (!profileData) {
      return apiError("Missing required field (profileData)", 400);
    }

    if (profileData.username) {
      const isAvailable = await checkUsernameAvailability(
        profileData.username,
        user!.id,
      );
      if (!isAvailable) {
        return apiError(
          "This username is already taken. Please choose another.",
          409,
        );
      }
    }

    let profilePhotoUrl = oauthAvatarUrl || null;
    if (
      profileData.profilePhoto &&
      typeof profileData.profilePhoto === "string"
    ) {
      profilePhotoUrl = profileData.profilePhoto;
      delete profileData.profilePhoto;
    }

    const updatedUser = await createOnboardingProfile(
      user!.id,
      profileData,
      profilePhotoUrl,
    );

    return apiSuccess(updatedUser);
  } catch (error: any) {
    console.error("Mobile API Save Onboarding Profile Error:", error);
    return apiError(error?.message || "Internal server error", 500);
  }
}
