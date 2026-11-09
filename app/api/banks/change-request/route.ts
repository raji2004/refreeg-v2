import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { submitBankChangeRequest } from "@/lib/kyc/payout-name-lock";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", success: false },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    if (!body.accountNumber || !body.bankCode || !body.bankName) {
      return NextResponse.json(
        { error: "Account number, bank code, and bank name are required", success: false },
        { status: 400 },
      );
    }

    const result = await submitBankChangeRequest(session.user.id, {
      accountNumber: body.accountNumber,
      bankCode: body.bankCode,
      bankName: body.bankName,
      changeReason: body.reason,
      proofDocumentUrl: body.proofDocumentUrl,
      isBeneficiaryAccount: Boolean(body.isBeneficiaryAccount),
      beneficiaryType: body.beneficiaryType,
      beneficiaryRelationship: body.beneficiaryRelationship,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to submit change request", success: false },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        requestId: result.requestId,
        message: "Bank account change request submitted. Our admin team will review it shortly.",
      },
    });
  } catch (error: any) {
    console.error("Bank change request API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request", success: false },
      { status: 500 },
    );
  }
}

