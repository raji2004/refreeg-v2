import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { checkUserSignature } from "@/actions/signature-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petitionId = searchParams.get("petitionId");
    const email = searchParams.get("email");

    if (!petitionId || !email) {
      return apiError("Missing required parameters (petitionId, email)", 400);
    }

    const hasSigned = await checkUserSignature(petitionId, email);
    
    return apiSuccess({ hasSigned });
  } catch (error: any) {
    console.error("Mobile API Check Signature Error:", error);
    return apiError("Internal server error", 500);
  }
}
