import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { saveStep1Progress, saveStep2Progress } from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { step, data } = body;

    if (!step || !data) {
      return apiError("Missing required fields (step, data)", 400);
    }
    
    if (step === 1 && data.accountType) {
      await saveStep1Progress(user!.id, data.accountType);
    } else if (step === 2 && data.gender) {
      await saveStep2Progress(user!.id, data.gender);
    } else {
      return apiError("Invalid step or missing data for that step", 400);
    }
    
    return apiSuccess({
      message: `Step ${step} saved successfully`
    });
  } catch (error: any) {
    console.error("Mobile API Save Onboarding Step Error:", error);
    return apiError("Internal server error", 500);
  }
}
