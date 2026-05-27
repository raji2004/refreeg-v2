import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { saveCauseShare } from "@/actions/cause-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // We allow anonymous shares, but we can extract userId from JWT if provided
    let userId: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const { verifyMobileToken } = await import("@/lib/auth/jwt");
        const token = authHeader.split(" ")[1];
        const payload = await verifyMobileToken(token);
        userId = payload.userId;
      } catch (e) {
        // Ignore invalid tokens for this endpoint
      }
    }

    await saveCauseShare(id, userId);
    
    return apiSuccess({ message: "Share recorded successfully" });
  } catch (error: any) {
    console.error("Mobile API Share Cause Error:", error);
    return apiError("Internal server error", 500);
  }
}
