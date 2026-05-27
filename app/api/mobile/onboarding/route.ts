import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getOnboardingData, getCurrentOnboardingStep, createOnboardingProfile } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const [onboardingData, currentStep] = await Promise.all([
      getOnboardingData(user!.id),
      getCurrentOnboardingStep(user!.id)
    ]);
    
    return apiSuccess({
      data: onboardingData,
      currentStep
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
    
    // Note: The mobile app will send an S3 key instead of a File object for profilePhoto
    // The server action 'createOnboardingProfile' expects a File object if profilePhoto exists
    // We will bypass the server action and update the user record directly if an s3Key is provided, 
    // or map the rest of the fields to the action.
    
    let profilePhotoUrl = oauthAvatarUrl || null;
    if (profileData.profilePhoto && typeof profileData.profilePhoto === 'string') {
        profilePhotoUrl = profileData.profilePhoto;
        delete profileData.profilePhoto; // Remove it so the action doesn't try to process it as a File
    }

    const updatedUser = await createOnboardingProfile(user!.id, profileData, profilePhotoUrl);
    
    return apiSuccess(updatedUser);
  } catch (error: any) {
    console.error("Mobile API Complete Onboarding Error:", error);
    return apiError("Internal server error", 500);
  }
}
