import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Flutterwave from "@/services/flutterwave";

export async function GET() {
  try {
    // Only fetch users who have a Paystack subaccount but no Flutterwave one
    const users = await prisma.user.findMany({
      where: {
        subAccountCode: { not: null },
        flutterwaveSubAccountId: null,
        accountNumber: { not: null },
        bankName: { not: null },
      },
      select: {
        id: true,
        email: true,
        accountNumber: true,
        bankName: true,
        fullName: true,
        username: true,
      },
    });

    if (users.length === 0) {
      return NextResponse.json({ message: "No users need migration at this time." });
    }

    const banks = await Flutterwave.listBanks();
    const results = [];

    for (const user of users) {
      try {
        // Find the matching Flutterwave bank code using the robust mapping
        const bankCode = await Flutterwave.getBankCode(user.bankName!);

        if (!bankCode) {
          results.push({
            email: user.email,
            status: "Failed",
            reason: `Bank name '${user.bankName}' not found in Flutterwave list`,
          });
          continue;
        }

        const isTestMode = process.env.FLUTTERWAVE_SECRET_KEY?.includes("TEST");

        const subaccount = await Flutterwave.createSubaccount({
          account_number: isTestMode ? "0690000031" : user.accountNumber!,
          bank_code: isTestMode ? "044" : bankCode,
          business_name: user.fullName || user.username || "RefreeG Cause Creator",
          business_email: user.email || "no-reply@refreeg.com",
        });

        if (subaccount?.subaccount_id) {
          // Update the user's profile with the new flutterwaveSubAccountId
          await prisma.user.update({
            where: { id: user.id },
            data: { flutterwaveSubAccountId: subaccount.subaccount_id },
          });

          results.push({
            email: user.email,
            status: "Success",
            subaccount_id: subaccount.subaccount_id,
          });
        } else {
          results.push({
            email: user.email,
            status: "Failed",
            reason: "Flutterwave did not return a subaccount_id (possibly invalid account number)",
          });
        }
      } catch (err: any) {
        results.push({
          email: user.email,
          status: "Failed",
          reason: err.response?.data?.message || err.message || "Unknown API Error",
          details: err.response?.data || null,
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${users.length} users`,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Migration script failed", details: error.message },
      { status: 500 }
    );
  }
}
