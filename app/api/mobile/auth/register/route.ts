import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { signUpAction } from "@/actions/auth-actions";
import { signMobileToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, accountType } = body;

    if (!email || !password || !fullName) {
      return apiError("Missing required fields (email, password, fullName)", 400);
    }

    const result = await signUpAction(email, password, fullName, accountType);

    if (!result.success) {
      return apiError(result.error || "Failed to create account", 400);
    }

    // Sign up succeeded, fetch the newly created user to get the ID
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, accountType: true, profilePhoto: true }
    });

    if (!user) {
      return apiError("Account created but failed to retrieve user data", 500);
    }

    // Generate token
    const token = await signMobileToken(user.id, user.email!);

    return apiSuccess({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        accountType: user.accountType,
        profilePhoto: user.profilePhoto
      }
    }, 201);
  } catch (error: any) {
    console.error("Mobile API Register Error:", error);
    return apiError("Internal server error", 500);
  }
}
