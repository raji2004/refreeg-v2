import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { requestPasswordResetAction } from "@/actions/auth-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return apiError("Missing required field (email)", 400);
    }

    const result = await requestPasswordResetAction(email);

    if (!result.success) {
      return apiError(result.error || "Failed to process request", 400);
    }

    return apiSuccess({
      message: "Password reset link sent successfully to your email."
    });
  } catch (error: any) {
    console.error("Mobile API Forgot Password Error:", error);
    return apiError("Internal server error", 500);
  }
}
