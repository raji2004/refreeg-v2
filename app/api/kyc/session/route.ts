import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  saveKycStepProgress,
  getResumableSession,
} from "@/lib/kyc/verification-engine";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const [profile, kycRecord, resumable] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isVerified: true, current_tier: true, accountType: true, fullName: true },
      }),
      prisma.kyc_verifications.findFirst({
        where: { user_id: session.user.id },
        orderBy: { created_at: "desc" },
      }),
      getResumableSession(session.user.id),
    ]);

    const isVerified = Boolean(profile?.isVerified);
    let status = kycRecord?.status || "not_started";
    if (isVerified) status = "approved";

    return NextResponse.json({
      success: true,
      data: {
        isVerified,
        kycTier: profile?.current_tier || (isVerified ? "Tier 2" : "Tier 1"),
        status,
        accountType: profile?.accountType || "individual",
        resumableSession: resumable,
      },
    });
  } catch (error: any) {
    console.error("KYC Session API Error:", error);
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await saveKycStepProgress(
      session.user.id,
      {
        currentStep: body.currentStep || 2,
        documentType: body.documentType,
        idNumber: body.idNumber,
        idLast4: body.idLast4,
        dob: body.dob,
        documentS3Key: body.documentS3Key,
        ocrRawText: body.ocrRawText,
      },
      Boolean(body.force_new),
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("KYC Save Step API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to save step", success: false }, { status: 500 });
  }
}

