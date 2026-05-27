import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const petitions = await prisma.petitions.findMany({
      where: { user_id: user!.id },
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
            profilePhoto: true,
          }
        }
      }
    });
    
    return apiSuccess(petitions);
  } catch (error: any) {
    console.error("Mobile API Get User Petitions Error:", error);
    return apiError("Internal server error", 500);
  }
}
