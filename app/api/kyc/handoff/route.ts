import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth/auth";
import { KYC_CONFIG, getHandoffSecret } from "@/lib/kyc/config";
import { getBaseURL } from "@/lib/utils";

const HANDOFF_SECRET = getHandoffSecret();

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const kycId = body.kycId || crypto.randomUUID();
    const issuedAt = Date.now();
    const expiresAt = issuedAt + KYC_CONFIG.handoffTtlMs;

    const payload = {
      userId: session.user.id,
      kycId,
      issuedAt,
      expiresAt,
    };

    const payloadStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", HANDOFF_SECRET)
      .update(payloadStr)
      .digest("hex");

    const token = `${Buffer.from(payloadStr).toString("base64url")}.${signature}`;
    const baseUrl = await getBaseURL();
    const handoffUrl = `${baseUrl}/kyc/handoff/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        handoffUrl,
        expiresAt,
      },
    });
  } catch (error: any) {
    console.error("KYC Handoff Token API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create handoff link", success: false },
      { status: 500 },
    );
  }
}

