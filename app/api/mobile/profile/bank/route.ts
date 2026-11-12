import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  hasBankDetails,
  updateBankDetails,
  getProfile,
} from "@/actions/profile-actions";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const profile = await getProfile(user!.id);
    const hasBank = !!(profile && profile.account_number && profile.bank_name);

    return apiSuccess({
      hasBankDetails: hasBank,
      accountNumber: profile?.account_number || null,
      bankName: profile?.bank_name || null,
      accountName: profile?.account_name || null,
      subAccountCode: profile?.sub_account_code || null,
    });
  } catch (error: any) {
    console.error("Mobile API Check Bank Details Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();

    if (!body.accountNumber || !body.bankName || !body.accountName) {
      return apiError(
        "Missing required fields (accountNumber, bankName, accountName)",
        400,
      );
    }

    const bankData = {
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      accountName: body.accountName,
      sub_account_code: body.sub_account_code,
    };

    const updatedProfile = await updateBankDetails(user!.id, bankData);

    // Send bank-account-added email & in-app notification (parity with web)
    try {
      const { sendMail } = await import("@/services/mail");
      sendMail({
        to: user!.email,
        subject: "Did You Just Add a Bank Account to RefreeG? 🏦",
        templateName: "bank-account-added",
        context: {
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          accountName: body.accountName,
          userName: user!.fullName || "Refreegerian",
          currentYear: new Date().getFullYear(),
        },
      }).catch((err) => console.error("Mobile bank email error:", err));

      const { createNotification } =
        await import("@/lib/notifications/notification-service");
      createNotification({
        userId: user!.id,
        title: "Payout Bank Account Updated 🏦",
        message: `Your payout bank account (${body.bankName} • ${body.accountNumber}) was saved to your RefreeG profile.`,
        type: "general",
      }).catch((err) => console.error("Mobile bank notification error:", err));
    } catch (_) {}

    return apiSuccess(updatedProfile);
  } catch (error: any) {
    console.error("Mobile API Update Bank Details Error:", error);
    return apiError("Internal server error", 500);
  }
}
