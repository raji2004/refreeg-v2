import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import Paystack from "@/services/paystack";
import { getBaseURL } from "@/lib/utils";
import { PLEDGE_VERIFICATION_AMOUNT_NGN } from "@/lib/pledge-constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pledgeId, guestToken } = body as {
      pledgeId?: string;
      guestToken?: string;
    };

    if (!pledgeId) {
      return NextResponse.json(
        { error: "Missing pledgeId", success: false },
        { status: 400 },
      );
    }

    const session = await auth();
    const user = session?.user;

    const pledge = await prisma.pledges.findUnique({
      where: { id: pledgeId },
      select: {
        id: true,
        cause_id: true,
        user_id: true,
        email: true,
        amount: true,
        reminder_date: true,
        name: true,
        token: true,
        paystack_payment_status: true,
      },
    });

    if (!pledge) {
      return NextResponse.json(
        { error: "Pledge not found", success: false },
        { status: 404 },
      );
    }

    if (pledge.paystack_payment_status !== "awaiting_authorization") {
      return NextResponse.json(
        { error: "Pledge is not awaiting card setup", success: false },
        { status: 400 },
      );
    }

    if (pledge.user_id) {
      if (!user || user.id !== pledge.user_id) {
        return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 });
      }
    } else {
      if (!guestToken || guestToken !== pledge.token) {
        return NextResponse.json({ error: "Forbidden", success: false }, { status: 403 });
      }
    }

    const cause = await prisma.cause.findUnique({
      where: { id: pledge.cause_id },
      select: { userId: true },
    });

    if (!cause?.userId) {
      return NextResponse.json(
        { error: "Cause not found", success: false },
        { status: 404 },
      );
    }

    const profile = await prisma.user.findUnique({
      where: { id: cause.userId },
      select: { subAccountCode: true },
    });

    const subaccount = profile?.subAccountCode?.trim() || "";

    const verificationAmount = PLEDGE_VERIFICATION_AMOUNT_NGN;
    // No service fee on the verification charge — it is not a donation.
    const serviceFee = 0;
    const baseUrl = getBaseURL();

    const response = await Paystack.initializeTransaction({
      email: pledge.email,
      amount: verificationAmount,
      serviceFee,
      causeId: pledge.cause_id,
      message: `Card verification for pledge of ₦${Number(pledge.amount).toLocaleString()} on ${pledge.reminder_date.toISOString().slice(0, 10)}`,
      isAnonymous: false,
      full_name: pledge.name,
      id: pledge.user_id || undefined,
      subaccounts: [{ subaccount, share: verificationAmount * 100 }],
      callbackUrl: `${baseUrl}/causes/${pledge.cause_id}/pledge/payment/verify`,
      pledgeFlow: "authorization",
      pledgeId: pledge.id,
      pledgeFutureAmount: Number(pledge.amount),
      reminderDate: pledge.reminder_date.toISOString().slice(0, 10),
    });

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    console.error("Pledge payment init error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize payment",
      },
      { status: 500 },
    );
  }
}
