import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { resetPasswordAction } from "@/actions/auth-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return apiError("Missing required fields (token, password)", 400);
    }

    const result = await resetPasswordAction(token, password);

    if (!result.success) {
      return apiError(result.error || "Failed to reset password", 400);
    }

    return apiSuccess({
      message: "Password reset successfully."
    });
  } catch (error: any) {
    console.error("Mobile API Reset Password Error:", error);
    return apiError("Internal server error", 500);
  }
}
