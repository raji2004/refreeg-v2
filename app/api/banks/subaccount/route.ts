import { NextRequest, NextResponse } from "next/server";
import { createDualSubaccounts } from "@/services/payment-provider";
import { normalizeAccountNumber } from "@/services/flutterwave";
import type { ICreateSubaccount } from "@/types";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { evaluateBankAccountSubmission } from "@/lib/kyc/payout-name-lock";

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

    if (!body.account_number || !body.bank_code) {
      return NextResponse.json(
        {
          error: "Account number and bank code are required",
          success: false,
        },
        { status: 400 },
      );
    }

    // 1. Evaluate Bank Submission (Live campaign lock + NIBSS Name Matching + Beneficiary flow)
    const evalResult = await evaluateBankAccountSubmission(session.user.id, {
      accountNumber: body.account_number,
      bankCode: body.bank_code,
      bankName: body.bank_name || "",
      isBeneficiaryAccount: Boolean(body.is_beneficiary_account),
      beneficiaryType: body.beneficiary_type,
      beneficiaryRelationship: body.beneficiary_relationship,
      proofDocumentUrl: body.proof_document_url,
    });

    if (!evalResult.allowed) {
      return NextResponse.json(
        {
          error: evalResult.error,
          requiresBeneficiaryDeclaration: evalResult.requiresBeneficiaryDeclaration,
          resolvedAccountName: evalResult.resolvedAccountName,
          success: false,
        },
        { status: evalResult.statusCode },
      );
    }

    const resolvedBusinessName =
      evalResult.resolvedAccountName || body.business_name;

    const data: ICreateSubaccount = {
      account_number: body.account_number,
      bank_code: body.bank_code,
      business_name: resolvedBusinessName,
      business_email: session.user.email || undefined,
      percentage_charge: 0,
    };

    const profile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { flutterwaveSubAccountId: true, accountNumber: true },
    });

    const sameAccount =
      normalizeAccountNumber(profile?.accountNumber) ===
      normalizeAccountNumber(data.account_number);
    const reuseFlutterwaveId =
      profile?.flutterwaveSubAccountId && sameAccount
        ? profile.flutterwaveSubAccountId
        : null;

    const result = await createDualSubaccounts(data, reuseFlutterwaveId);

    // If beneficiary account, record review request event
    if (evalResult.payoutVerificationStatus === "pending_beneficiary_review") {
      await prisma.events.create({
        data: {
          user_id: session.user.id,
          event_type: "beneficiary_payout_declaration",
          metadata: {
            status: "pending",
            account_number: body.account_number,
            bank_code: body.bank_code,
            bank_name: body.bank_name,
            account_name: evalResult.resolvedAccountName,
            beneficiary_type: body.beneficiary_type,
            beneficiary_relationship: body.beneficiary_relationship,
            proof_document_url: body.proof_document_url || null,
            created_at: new Date().toISOString(),
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        subaccount_code: result.paystack?.subaccount_code || null,
        account_number: result.paystack?.account_number || data.account_number,
        account_name: evalResult.resolvedAccountName,
        flutterwave_sub_account_id: result.flutterwave?.subaccount_id || null,
        payout_verification_status: evalResult.payoutVerificationStatus,
      },
    });
  } catch (error: any) {
    console.error("Error creating subaccounts:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create subaccount",
        success: false,
      },
      { status: error.response?.status || 500 },
    );
  }
}
