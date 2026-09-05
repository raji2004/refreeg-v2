import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReferralRecord } from "@/lib/referral-utils";

// Flat one-time EIZA credit granted on email verification (no ledger/history
// for this pass — matches a single "150 EIZA" welcome credit, not itemized).
const SIGNUP_EIZA_BONUS = 150;

function createOrganizationSlug(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return `${base || "organization"}-${crypto.randomUUID().slice(0, 8)}`;
}

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

    // 5. Create the user/workspace and delete pending registration atomically.
    const newProfile = await prisma.$transaction(async (tx) => {
      const nameParts = pending.fullName.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(" ") || null;

      const profile = await tx.user.create({
        data: {
          email: pending.email,
          password: pending.password,
          fullName: pending.fullName,
          firstName,
          lastName,
          phone:
            pending.accountType === "organization"
              ? pending.organizationPhone
              : null,
          accountType: pending.accountType,
          emailVerified: new Date(),
          isVerified: false,
          onboarding_completed: false,
          total_points: SIGNUP_EIZA_BONUS,
        },
      });

      if (pending.accountType === "organization" && pending.organizationName) {
        const organization = await tx.organization.create({
          data: {
            name: pending.organizationName,
            slug: createOrganizationSlug(pending.organizationName),
            adminEmail: pending.email,
            phone: pending.organizationPhone,
            address: pending.organizationAddress,
            industry: pending.organizationIndustry,
            ownerId: profile.id,
            preferences: {
              memberActivityEmails: true,
              campaignUpdateEmails: true,
            },
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: profile.id,
            role: "owner",
          },
        });
      }

      // --- Referral Integration ---
      if (pending.referralCode) {
        // createReferralRecord is non-throwing and idempotent
        await createReferralRecord({
          referralCode: pending.referralCode,
          newUserId: profile.id,
          email: profile.email as string,
          utmFields: {
            utm_source: pending.utm_source,
            utm_medium: pending.utm_medium,
            utm_campaign: pending.utm_campaign,
            ip_address: pending.ip_address,
            user_agent: pending.user_agent,
          },
        });
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
