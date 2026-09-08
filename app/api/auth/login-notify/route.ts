import { NextResponse } from "next/server";
import { sendLoginNotificationEmail } from "@/services/mail";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, userName, loginTime, device, userAgent } = body;

    if (!email || !userName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fingerprinting Logic
    const profile = await prisma.user.findUnique({
      where: { email },
      select: { lastLoginUserAgent: true }
    });

    // If we have a stored agent and it matches the current one, skip the email
    if (profile && profile.lastLoginUserAgent === userAgent) {
      return NextResponse.json({ success: true, message: "Known device" });
    }

    // Skip sending login emails for the E2E test account to prevent SMTP rate limits and hangs
    if (email === "kingraj1344@gmail.com" || email === process.env.REFREEG_E2E_EMAIL) {
      return NextResponse.json({ success: true, message: "Skipped for E2E user" });
    }

    // New device or first time! Send the email.
    await sendLoginNotificationEmail({
      email,
      userName,
      loginTime,
      device,
    });

    // Update the last known agent in the database
    await prisma.user.update({
      where: { email },
      data: { lastLoginUserAgent: userAgent }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login notify error:", error);
    return NextResponse.json({ error: "Failed to process notification" }, { status: 500 });
  }
}
