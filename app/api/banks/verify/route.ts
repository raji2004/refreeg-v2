import { NextRequest, NextResponse } from "next/server";
import { verifyAccountNumber } from "@/services/payment-provider";
import { auth } from "@/lib/auth/auth";
import { createRateLimiter } from "@/lib/api/rate-limit";
import type { PaymentProviderType } from "@/types";

const limited = createRateLimiter({ max: 10, windowMs: 60_000 });

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required", success: false },
      { status: 401 },
    );
  }
  if (limited(session.user.id)) {
    return NextResponse.json(
      {
        error: "Too many verification attempts. Try again shortly.",
        success: false,
      },
      { status: 429 },
    );
  }

  try {
    const { accountNumber, bankCode, provider } = (await request.json()) as {
      accountNumber?: string;
      bankCode?: string;
      provider?: PaymentProviderType;
    };

    if (
      !accountNumber ||
      !bankCode ||
      !/^\d{6,20}$/.test(accountNumber) ||
      !/^[A-Za-z0-9_-]{1,20}$/.test(bankCode)
    ) {
      return NextResponse.json(
        {
          error: "Account number and bank code are required",
          success: false,
        },
        { status: 400 },
      );
    }
    const verification = await verifyAccountNumber(
      accountNumber,
      bankCode,
      provider,
    );

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (error: any) {
    console.error("Error verifying account:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to verify account number",
        success: false,
      },
      { status: error.response?.status || 500 },
    );
  }
}
