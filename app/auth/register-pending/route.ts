import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/services/mail";
import { getClientIp } from "@/lib/client-ip";
import { generateOtpCode, hashOtpCode } from "@/lib/auth/otp";
import {
  normalizeRegistrationInput,
  type RegistrationInput,
  validateRegistrationInput,
} from "@/lib/auth/registration";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const registration = normalizeRegistrationInput({
      accountType: body.accountType,
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      organizationName: body.organizationName,
      organizationPhone: body.organizationPhone,
      organizationAddress: body.organizationAddress,
      organizationIndustry: body.organizationIndustry,
    } as RegistrationInput);
    const validationErrors = validateRegistrationInput(registration);
    const firstError = Object.values(validationErrors)[0];

    if (firstError) {
      return NextResponse.json(
        { error: firstError, fieldErrors: validationErrors },
        { status: 400 },
      );
    }

    const { email, password, fullName, accountType } = registration;
    const referralCode = body.referralCode || null;

    const utm_source = body.utm_source || null;
    const utm_medium = body.utm_medium || null;
    const utm_campaign = body.utm_campaign || null;
    const user_agent = body.user_agent || null;
    const ip_address = getClientIp(req.headers);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Only the HMAC goes to the database; the plaintext code exists in the
    // email alone. On re-submission the failed-attempt counter is preserved
    // so issuing new codes never resets the brute-force lockout.
    const otpCode = generateOtpCode();
    const otpHash = hashOtpCode(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.pendingRegistration.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        fullName,
        accountType,
        organizationName: registration.organizationName,
        organizationPhone: registration.organizationPhone,
        organizationAddress: registration.organizationAddress,
        organizationIndustry: registration.organizationIndustry,
        referralCode,
        utm_source,
        utm_medium,
        utm_campaign,
        user_agent,
        ip_address,
        otpCode: otpHash,
        expiresAt,
        lastOtpSentAt: new Date(),
      },
      create: {
        email,
        password: hashedPassword,
        fullName,
        accountType,
        organizationName: registration.organizationName,
        organizationPhone: registration.organizationPhone,
        organizationAddress: registration.organizationAddress,
        organizationIndustry: registration.organizationIndustry,
        referralCode,
        utm_source,
        utm_medium,
        utm_campaign,
        user_agent,
        ip_address,
        otpCode: otpHash,
        expiresAt,
        lastOtpSentAt: new Date(),
      },
    });

    const emailResult = await sendOtpEmail({
      email,
      userName: fullName,
      otpCode,
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again later." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "OTP sent successfully." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Register pending error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 },
    );
  }
}
