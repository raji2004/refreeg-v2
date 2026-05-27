import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { refreshMobileToken } from "@/lib/auth/jwt";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiError("Missing or invalid authorization header", 401);
    }

    const currentToken = authHeader.split(" ")[1];

    if (!currentToken) {
      return apiError("Token not provided", 401);
    }

    const newToken = await refreshMobileToken(currentToken);

    return apiSuccess({
      token: newToken
    });
  } catch (error: any) {
    console.error("Mobile API Refresh Token Error:", error);
    return apiError("Invalid or expired token", 401);
  }
}
