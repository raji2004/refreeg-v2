import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { createDonation } from "@/actions/donation-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.causeId || !body.amount || !body.donorName || !body.donorEmail) {
      return apiError("Missing required fields (causeId, amount, donorName, donorEmail)", 400);
    }

    const donationData = {
      causeId: body.causeId,
      amount: Number(body.amount),
      tipAmount: Number(body.tipAmount || 0),
      donorName: body.donorName,
      donorEmail: body.donorEmail,
      message: body.message || "",
      isAnonymous: Boolean(body.isAnonymous),
      currency: body.currency || "NGN"
    };

    const result = await createDonation(
      body.causeId,
      null, // userId is not strictly required for mobile donation endpoint yet, or we can use auth if present
      {
        amount: Number(body.amount),
        name: body.donorName,
        email: body.donorEmail,
        message: body.message || "",
        isAnonymous: Boolean(body.isAnonymous),
      } as any,
      Number(body.tipAmount || 0)
    );
    
    return apiSuccess(result, 201);
  } catch (error: any) {
    console.error("Mobile API Create Donation Error:", error);
    return apiError("Internal server error", 500);
  }
}
