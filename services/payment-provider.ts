
import type { PaymentProviderType, ICreateSubaccount, TransactionData } from "@/types";
import Paystack from "@/services/paystack";
import Flutterwave from "@/services/flutterwave";

export function getProvider(provider?: PaymentProviderType | string | null) {
  return provider === "flutterwave" ? Flutterwave : Paystack;
}

export async function initializeTransaction(
  data: TransactionData,
  provider?: PaymentProviderType,
) {
  return getProvider(provider).initializeTransaction(data);
}

export async function verifyTransaction(
  reference: string,
  provider?: PaymentProviderType,
) {
  if (provider === "flutterwave") {
    return Flutterwave.verifyByReference(reference);
  }
  return Paystack.verifyTransaction(reference);
}

export async function verifyTransactionFull(
  reference: string,
  provider?: PaymentProviderType,
) {
  if (provider === "flutterwave") {
    return Flutterwave.verifyByReferenceFull(reference);
  }
  return Paystack.verifyTransactionFull(reference);
}

export async function listBanks(provider?: PaymentProviderType) {
  return getProvider(provider).listBanks();
}

export async function verifyAccountNumber(
  accountNumber: string,
  bankCode: string,
  provider?: PaymentProviderType,
) {
  return getProvider(provider).verifyAccountNumber(accountNumber, bankCode);
}

export async function createSubaccount(data: ICreateSubaccount, provider?: PaymentProviderType) {
  return getProvider(provider).createSubaccount(data);
}


export async function createDualSubaccounts(data: ICreateSubaccount) {
  const [paystackResult, flutterwaveResult] = await Promise.allSettled([
    Paystack.createSubaccount(data),
    Flutterwave.createSubaccount(data),
  ]);

  return {
    paystack:
      paystackResult.status === "fulfilled"
        ? paystackResult.value
        : (() => {
            console.error("Paystack subaccount creation failed:", (paystackResult as PromiseRejectedResult).reason);
            return null;
          })(),
    flutterwave:
      flutterwaveResult.status === "fulfilled"
        ? flutterwaveResult.value
        : (() => {
            console.error("Flutterwave subaccount creation failed:", (flutterwaveResult as PromiseRejectedResult).reason);
            return null;
          })(),
  };
}
