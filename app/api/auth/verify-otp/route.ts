import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otpCode } = body;

    if (!email || !otpCode) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // 1. Fetch pending registration
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: normalizedEmail },
    });

    if (!pending) {
      return NextResponse.json(
        { error: "No pending registration found for this email." },
        { status: 404 }
      );
    }

    // 2. Check if locked out (too many failed attempts)
    if (pending.failedAttempts >= 5) {
      await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } });
      return NextResponse.json(
        { error: "Too many failed attempts. Please sign up again." },
        { status: 429 }
      );
    }

    // 3. Check expiration
    if (new Date() > pending.expiresAt) {
      await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 4. Validate OTP
    if (pending.otpCode !== otpCode) {
      const newAttempts = pending.failedAttempts + 1;
      if (newAttempts >= 5) {
        await prisma.pendingRegistration.delete({ where: { email: normalizedEmail } });
        return NextResponse.json(
          { error: "Too many failed attempts. Please sign up again." },
          { status: 429 }
        );
      }
      await prisma.pendingRegistration.update({
        where: { email: normalizedEmail },
        data: { failedAttempts: newAttempts },
      });
      return NextResponse.json(
        { error: `Invalid verification code. ${5 - newAttempts} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // 4. Create Profile and delete pending registration in transaction
    const newProfile = await prisma.$transaction(async (tx) => {
      const baseUsername = pending.fullName.replace(/\s+/g, "").toLowerCase() || normalizedEmail.split("@")[0];
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      
      const profile = await tx.user.create({
        data: {
          email: pending.email,
          password: pending.password,
          fullName: pending.fullName,
          username: `${baseUsername}${uniqueSuffix}`,
          emailVerified: new Date(),
          isVerified: true,
        },
      });

      // --- Referral Integration ---
      if (pending.referralCode) {
        const referrer = await tx.user.findUnique({
          where: { referralCode: pending.referralCode },
          select: { id: true, total_points: true }
        });

        if (referrer) {
          // 1. Create the referral record (v1 legacy support)
          await tx.referrals_v1.create({
            data: {
              referrer_id_v1: referrer.id,
              referee_id_v1: profile.id,
              referee_email_v1: profile.email as string,
              registered_v1: true,
              reward_v1: "5 points",
            }
          });

          // 2. Grant the points to the referrer
          await tx.user.update({
            where: { id: referrer.id },
            data: {
              total_points: { increment: 5 }
            }
          });

          // 3. Log the reward transaction
          await tx.rewardTransaction.create({
            data: {
              userId: referrer.id,
              amount: 5,
              transactionType: "referral_bonus",
              status: "completed"
            }
          });
        }
      }
      // ----------------------------

      await tx.pendingRegistration.delete({
        where: { email: normalizedEmail },
      });

      return profile;
    });

    // 5. Generate auto-login token
    const secret = process.env.AUTH_SECRET || "fallback_secret";
    const timestamp = Date.now().toString();
    const b64Email = Buffer.from(normalizedEmail).toString("base64");
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${b64Email}:${timestamp}`));
    const hmac = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const loginToken = `${b64Email}:${timestamp}:${hmac}`;

    return NextResponse.json(
      { 
        message: "Email verified successfully.", 
        profileId: newProfile.id,
        loginToken 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during verification." },
      { status: 500 }
    );
  }
}
