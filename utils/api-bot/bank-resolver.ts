import Paystack from "@/services/paystack";
import { prisma } from "@/lib/prisma";
import { ApiErrorCode } from "@/utils/api-bot/response-utils";

export async function resolveBankDetails(
  userId: string,
  mode: "live" | "test",
  data: {
    bank_id?: string;
    bank_account_number?: string;
    bank_code?: string;
    bank_account_name?: string;
    title?: string;
  }
) {
  let bankDetails = {
    bank_account_number: data.bank_account_number,
    bank_code: data.bank_code,
    bank_account_name: data.bank_account_name,
    sub_account_code: null as string | null,
    bank_account_id: data.bank_id || null as string | null
  };

  if (data.bank_id) {
    let bankAcc;
    try {
      bankAcc = await prisma.api_bank_accounts.findFirst({
        where: {
          id: data.bank_id,
          developer_id: userId,
        }
      });
    } catch (e) {
      console.error(e);
    }
    
    if (!bankAcc) {
      return { error: "Bank profile not found or access denied", code: ApiErrorCode.NOT_FOUND, status: 404 };
    }

    bankDetails.bank_account_number = bankAcc.bank_account_number;
    bankDetails.bank_code = bankAcc.bank_code;
    bankDetails.bank_account_name = bankAcc.bank_account_name;
    bankDetails.sub_account_code = bankAcc.sub_account_code;
  } else if (data.bank_account_number && data.bank_code && data.bank_account_name) {
    // Create sub-account for direct details
    try {
      const subAccount = await Paystack.createSubaccount({
        business_name: data.title || "RefreeG Campaign",
        bank_code: data.bank_code,
        account_number: data.bank_account_number,
        percentage_charge: 2 
      });
      bankDetails.sub_account_code = subAccount.subaccount_code;

      // Auto-save this as a bank profile for the developer
      let newBank;
      try {
        newBank = await prisma.api_bank_accounts.create({
          data: {
            developer_id: userId,
            bank_account_number: data.bank_account_number,
            bank_code: data.bank_code,
            bank_account_name: data.bank_account_name,
            sub_account_code: bankDetails.sub_account_code,
            mode: mode
          }
        });
      } catch (e) {
        console.error("Failed to auto-save bank profile", e);
      }
      
      if (newBank) bankDetails.bank_account_id = newBank.id;

    } catch (err: any) {
      return { 
        error: "Failed to verify bank details with payment provider. Please ensure the account number and bank code are correct.", 
        code: ApiErrorCode.PAYMENT_SETUP_FAILED, 
        status: 400 
      };
    }
  }

  return { bankDetails };
}
