import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  getInterestOptions,
  saveUserInterests,
} from "@/actions/interest-actions";
import { MIN_INTERESTS_REQUIRED } from "@/lib/interest-categories";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const options = await getInterestOptions();
    return apiSuccess({
      options,
      minRequired: MIN_INTERESTS_REQUIRED,
    });
  } catch (error: any) {
    console.error("Mobile API Get Interests Error:", error);
    return apiError("Failed to fetch interest options", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { interests, location } = body;

    if (!Array.isArray(interests)) {
      return apiError("Interests must be an array", 400);
    }

    if (interests.length < MIN_INTERESTS_REQUIRED) {
      return apiError(
        `Please select at least ${MIN_INTERESTS_REQUIRED} interests`,
        400,
      );
    }

    await saveUserInterests(user!.id, { interests, location });
    return apiSuccess({
      message: "Interests saved successfully",
      interests,
    });
  } catch (error: any) {
    console.error("Mobile API Save Interests Error:", error);
    return apiError("Failed to save interests", 500);
  }
}
