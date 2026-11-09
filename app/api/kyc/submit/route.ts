import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { submitKycVerification } from "@/lib/kyc/verification-engine";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!body.manifest || !body.manifest.challengeToken) {
      return NextResponse.json(
        { error: "Missing active challenge manifest", success: false },
        { status: 400 },
      );
    }

    let frame0: Buffer;
    let frame1: Buffer;
    let frame2: Buffer;
    let docBuffer: Buffer | undefined;

    if (body.framesBase64 && Array.isArray(body.framesBase64) && body.framesBase64.length === 3) {
      frame0 = Buffer.from(body.framesBase64[0], "base64");
      frame1 = Buffer.from(body.framesBase64[1], "base64");
      frame2 = Buffer.from(body.framesBase64[2], "base64");
    } else {
      frame0 = Buffer.alloc(100);
      frame1 = Buffer.alloc(100);
      frame2 = Buffer.alloc(100);
    }

    if (body.documentImageBase64) {
      docBuffer = Buffer.from(body.documentImageBase64, "base64");
    }

    const outcome = await submitKycVerification(session.user.id, {
      kycId: body.kycId,
      documentType: body.documentType || "nin_slip",
      idNumber: body.idNumber,
      dob: body.dob,
      documentImageBuffer: docBuffer,
      documentS3Key: body.documentS3Key,
      selfieFrames: [frame0, frame1, frame2],
      manifest: body.manifest,
      ocrRawText: body.ocrRawText,
    });

    return NextResponse.json({ success: true, data: outcome });
  } catch (error: any) {
    console.error("KYC Submit API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit verification", success: false },
      { status: 500 },
    );
  }
}

