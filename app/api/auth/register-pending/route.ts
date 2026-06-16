import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/services/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, firstName, lastName, username, referralCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Check if user already exists in public.profiles
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || username || email.split("@")[0];

    // 3. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 4. Upsert into PendingRegistration
    // Using upsert ensures if they request a new OTP, we just overwrite the old pending state
    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        fullName,
        referralCode,
        otpCode,
        expiresAt,
        failedAttempts: 0,
        lastOtpSentAt: new Date(),
      },
      create: {
        email,
        password: hashedPassword,
        fullName,
        referralCode,
        otpCode,
        expiresAt,
        lastOtpSentAt: new Date(),
      },
    });

    // 5. Send Email via ZeptoMail
    const emailResult = await sendOtpEmail({
      email,
      userName: fullName,
      otpCode,
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "OTP sent successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Register pending error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
