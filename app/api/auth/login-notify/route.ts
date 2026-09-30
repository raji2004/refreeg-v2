import { NextResponse } from "next/server";
import { sendLoginNotificationEmail } from "@/services/mail";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, userName, loginTime, device, userAgent } = body;

    if (!email || !userName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const profile = await prisma.user.findUnique({
      where: { email },
      select: { lastLoginUserAgent: true },
    });

    if (profile && profile.lastLoginUserAgent === userAgent) {
      return NextResponse.json({ success: true, message: "Known device" });
    }

    if (
      email === "kingraj1344@gmail.com" ||
      email === process.env.REFREEG_E2E_EMAIL
    ) {
      return NextResponse.json({
        success: true,
        message: "Skipped for E2E user",
      });
    }

    await sendLoginNotificationEmail({
      email,
      userName,
      loginTime,
      device,
    });

    await prisma.user.update({
      where: { email },
      data: { lastLoginUserAgent: userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login notify error:", error);
    return NextResponse.json(
      { error: "Failed to process notification" },
      { status: 500 },
    );
  }
}
