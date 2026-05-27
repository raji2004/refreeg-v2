import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { s3Key } = body;

    if (!s3Key) {
      return apiError("Missing required field (s3Key)", 400);
    }

    await prisma.user.update({
      where: { id: user!.id },
      data: { profilePhoto: s3Key },
    });

    return apiSuccess({
      message: "Profile photo updated successfully",
      profile_photo: s3Key
    });
  } catch (error: any) {
    console.error("Mobile API Update Profile Photo Error:", error);
    return apiError("Internal server error", 500);
  }
}
