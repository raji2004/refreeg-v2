import { NextRequest } from "next/server";
import { apiSuccess, apiError, apiPaginated, handleCorsPreflight } from "@/lib/api/response";
import { listDonationsForCause } from "@/actions/donation-actions";
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

    const donations = await listDonationsForCause(id);
    
    // We don't have a count function in donation-actions, so we'll do it manually
    const total = await prisma.donation.count({
      where: {
        causeId: id,
        status: "successful",
      },
    });
    
    return apiPaginated(donations, total, limit, offset);
  } catch (error: any) {
    console.error("Mobile API Get Cause Donations Error:", error);
    return apiError("Internal server error", 500);
  }
}
