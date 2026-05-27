import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { createPledge } from "@/actions/pledge-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.causeId || !body.amount || !body.reminderDate || !body.name || !body.email) {
      return apiError("Missing required fields (causeId, amount, reminderDate, name, email)", 400);
    }

    const pledgeData = {
      causeId: body.causeId,
      amount: Number(body.amount),
      reminderDate: body.reminderDate,
      name: body.name,
      email: body.email,
      note: body.note,
      causeTitle: body.causeTitle
    };

    const result = await createPledge(pledgeData);
    
    if (result.error) {
      return apiError(result.error, 400);
    }
    
    return apiSuccess(result.data, 201);
  } catch (error: any) {
    console.error("Mobile API Create Pledge Error:", error);
    return apiError("Internal server error", 500);
  }
}
