import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/services/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if there is an existing pending registration
    const pendingUser = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pendingUser) {
      return NextResponse.json(
        { error: "No pending registration found. Please sign up again." },
        { status: 404 }
      );
    }

    // Rate limit: prevent resending more than once per minute
    if (pendingUser.lastOtpSentAt) {
      const secondsSinceLastSend = (Date.now() - pendingUser.lastOtpSentAt.getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastSend);
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting a new code.` },
          { status: 429 }
        );
      }
    }

    // Generate a new 6-digit OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update pending registration (reset failed attempts since new code is issued)
    await prisma.pendingRegistration.update({
      where: { email: normalizedEmail },
      data: {
        otpCode: newOtp,
        expiresAt: newExpiresAt,
        failedAttempts: 0,
        lastOtpSentAt: new Date(),
      },
    });

    // Send the new OTP email
    await sendOtpEmail({
      email: normalizedEmail,
      userName: pendingUser.fullName,
      otpCode: newOtp,
    });

    return NextResponse.json(
      { message: "A new verification code has been sent to your email." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
