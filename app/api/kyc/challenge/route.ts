import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { issueKycChallenge } from "@/lib/kyc/server-biometrics";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const kycId = body.kycId || crypto.randomUUID();
    const challenge = issueKycChallenge(session.user.id, kycId);

    return NextResponse.json({ success: true, data: challenge });
  } catch (error: any) {
    console.error("KYC Challenge API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate challenge", success: false }, { status: 500 });
  }
}

