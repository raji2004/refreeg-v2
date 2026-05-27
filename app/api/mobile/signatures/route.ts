import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { createSignature } from "@/actions/signature-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.petitionId || !body.firstName || !body.lastName || !body.email || !body.country) {
      return apiError("Missing required fields (petitionId, firstName, lastName, email, country)", 400);
    }

    const signatureData = {
      petitionId: body.petitionId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      country: body.country,
      city: body.city,
      state: body.state,
      isAnonymous: Boolean(body.isAnonymous),
      comment: body.comment
    };

    const result = await createSignature(
      body.petitionId,
      null, // Anonymous or pass user ID if auth is added
      {
        amount: Number(body.amount || 1),
        name: `${body.firstName} ${body.lastName}`,
        email: body.email,
        message: body.comment || "",
        isAnonymous: Boolean(body.isAnonymous),
      } as any
    );
    
    return apiSuccess(result, 201);
  } catch (error: any) {
    console.error("Mobile API Create Signature Error:", error);
    return apiError("Internal server error", 500);
  }
}
