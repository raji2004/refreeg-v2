import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { completeOnboarding } from "@/actions/profile-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    await completeOnboarding(user!.id);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        firstName: true,
        lastName: true,
        username: true,
        accountType: true,
        profilePhoto: true,
        isVerified: true,
        onboarding_completed: true,
      },
    });

    return apiSuccess({
      message: "Onboarding completed successfully",
      user: {
        id: updatedUser?.id,
        email: updatedUser?.email,
        fullName: updatedUser?.fullName,
        accountType: updatedUser?.accountType,
        profilePhoto: updatedUser?.profilePhoto,
        isVerified: updatedUser?.isVerified,
        onboardingCompleted: updatedUser?.onboarding_completed ?? true,
      },
    });
  } catch (error: any) {
    console.error("Mobile API Complete Onboarding Error:", error);
    return apiError(error?.message || "Failed to complete onboarding", 400);
  }
}
