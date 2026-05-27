import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated, handleCorsPreflight } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    const signatures = await prisma.signatures.findMany({
      where: { petition_id: id },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        name: true,
        is_anonymous: true,
        created_at: true,
        message: true,
      }
    });

    const total = await prisma.signatures.count({
      where: { petition_id: id },
    });
    
    return apiPaginated(signatures, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Petition Signatures Error:", error);
    return apiError("Internal server error", 500);
  }
}
