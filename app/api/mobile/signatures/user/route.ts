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

    const signatures = await prisma.signatures.findMany({
      where: { email: user!.email },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
      include: {
        petition: {
          select: {
            title: true,
            image: true,
          }
        }
      }
    });

    const total = await prisma.signatures.count({
      where: { email: user!.email },
    });
    
    return apiPaginated(signatures, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get User Signatures Error:", error);
    return apiError("Internal server error", 500);
  }
}
