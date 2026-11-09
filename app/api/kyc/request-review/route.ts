import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { requestHumanReview } from "@/lib/kyc/verification-engine";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (!body.kycId) {
      return NextResponse.json({ error: "Missing kycId", success: false }, { status: 400 });
    }

    const result = await requestHumanReview(session.user.id, body.kycId, body.reason);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to request review", success: false }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        outcome: "under_review",
        message: "Your submission has been routed to our human review team.",
      },
    });
  } catch (error: any) {
    console.error("KYC Request Review API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to request review", success: false }, { status: 500 });
  }
}

