import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getProfile, updateProfile } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const profile = await getProfile(user!.id);
    
    if (!profile) {
      return apiError("Profile not found", 404);
    }
    
    return apiSuccess(profile);
  } catch (error: any) {
    console.error("Mobile API Get Profile Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    
    // We expect the body to match ProfileFormData, but the mobile app might send snake_case
    // Map snake_case to camelCase where necessary for the action
    const profileData = {
      name: body.full_name || body.name,
      email: body.email,
      username: body.username,
      phone: body.phone,
      bio: body.bio,
      account_type: body.account_type,
      profile_photo: body.profile_photo,
      twitter_url: body.twitter_url,
      facebook_url: body.facebook_url,
      instagram_url: body.instagram_url,
      linkedin_url: body.linkedin_url,
    };

    const updatedProfile = await updateProfile(user!.id, profileData);
    
    return apiSuccess(updatedProfile);
  } catch (error: any) {
    console.error("Mobile API Update Profile Error:", error);
    return apiError("Internal server error", 500);
  }
}
