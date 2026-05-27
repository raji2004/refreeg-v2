import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const donations = await prisma.donation.findMany({
      where: { email: user!.email },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        cause: {
          select: {
            title: true,
            image: true,
          }
        }
      }
    });

    const total = await prisma.donation.count({
      where: { email: user!.email },
    });
    
    return apiPaginated(donations, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get User Donations Error:", error);
    return apiError("Internal server error", 500);
  }
}
