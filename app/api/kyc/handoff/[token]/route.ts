import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { submitKycVerification, getResumableSession } from "@/lib/kyc/verification-engine";
import { issueKycChallenge } from "@/lib/kyc/server-biometrics";
import { getHandoffSecret } from "@/lib/kyc/config";

const HANDOFF_SECRET = getHandoffSecret();

function verifyHandoffToken(token: string): { valid: boolean; userId?: string; kycId?: string; error?: string } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false, error: "Invalid token format" };

    const [payloadB64, signature] = parts;
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const expectedSig = crypto
      .createHmac("sha256", HANDOFF_SECRET)
      .update(payloadStr)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSig, "hex"),
      )
    ) {
      return { valid: false, error: "Invalid token signature" };
    }

    const payload = JSON.parse(payloadStr);
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: "QR code expired. Please refresh the QR code on your computer." };
    }

    return { valid: true, userId: payload.userId, kycId: payload.kycId };
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to verify token" };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const verified = verifyHandoffToken(token);
  if (!verified.valid || !verified.userId) {
    return NextResponse.json({ error: verified.error, success: false }, { status: 400 });
  }

  try {
    const [user, session] = await Promise.all([
      prisma.user.findUnique({
        where: { id: verified.userId },
        select: { fullName: true, firstName: true, lastName: true },
      }),
      getResumableSession(verified.userId),
    ]);

    const challenge = issueKycChallenge(verified.userId, verified.kycId || crypto.randomUUID());

    return NextResponse.json({
      success: true,
      data: {
        userId: verified.userId,
        kycId: verified.kycId,
        userName: user?.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
        session,
        challenge,
      },
    });
  } catch (error: any) {
    console.error("KYC Handoff GET Error:", error);
    return NextResponse.json({ error: "Failed to load session", success: false }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const verified = verifyHandoffToken(token);
  if (!verified.valid || !verified.userId) {
    return NextResponse.json({ error: verified.error, success: false }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    if (!body.manifest || !body.manifest.challengeToken) {
      return NextResponse.json({ error: "Missing active challenge manifest", success: false }, { status: 400 });
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

    const outcome = await submitKycVerification(verified.userId, {
      kycId: verified.kycId,
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
    console.error("KYC Handoff POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit verification", success: false },
      { status: 500 },
    );
  }
}

