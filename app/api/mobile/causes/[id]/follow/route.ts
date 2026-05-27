import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    
    // Check if cause exists
    const cause = await prisma.cause.findUnique({ where: { id } });
    if (!cause) {
      return apiError("Cause not found", 404);
    }

    // Check if already following
    const existing = await prisma.campaign_follows.findFirst({
      where: { user_id: user!.id, cause_id: id }
    });

    if (existing) {
      return apiSuccess({ message: "Already following this cause" });
    }

    await prisma.campaign_follows.create({
      data: {
        user_id: user!.id,
        cause_id: id,
        email: user!.email
      }
    });
    
    return apiSuccess({ message: "Successfully followed cause" });
  } catch (error: any) {
    console.error("Mobile API Follow Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    
    const existing = await prisma.campaign_follows.findFirst({
      where: { user_id: user!.id, cause_id: id }
    });

    if (existing) {
      await prisma.campaign_follows.delete({
        where: { id: existing.id }
      });
    }
    
    return apiSuccess({ message: "Successfully unfollowed cause" });
  } catch (error: any) {
    console.error("Mobile API Unfollow Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
