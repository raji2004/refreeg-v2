import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getBaseURL(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (!configured) return "http://localhost:3000";

  // A misconfigured secret (e.g. "apps.refreeg.com" instead of
  // "https://apps.refreeg.com") silently produced an invalid redirect_url
  // for every Flutterwave payment — their API rejects a bare hostname as
  // "not a valid uri". Normalize a missing scheme instead of trusting the
  // env var is well-formed.
  return /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
}
const SERVICE_FEE_CAP_NAIRA = 10000;

export const calculateServiceFee = (amount: number): number => {
  const serviceFeePercentage = Number(
    process.env.NEXT_PUBLIC_REFREEG_SERVICE_FEE || "0",
  );
  const fee = Math.round(amount * (serviceFeePercentage / 100) || 0);
  return Math.min(fee, SERVICE_FEE_CAP_NAIRA);
};

/**
 * Calculates the payment provider's transaction fee that will be charged
 * against the total amount, so we can pass this cost on to the donor and
 * ensure the cause creator always receives 100% of the donation amount.
 *
 * Paystack NGN: 1.5% + ₦100 (for amounts > ₦2,500), capped at ₦2,000
 * Flutterwave NGN: 1.4% + ₦100, capped at ₦2,000
 */
export const calculateProviderFee = (
  donationAmount: number,
  provider: "paystack" | "flutterwave" = "paystack",
): number => {
  if (provider === "flutterwave") {
    // Flutterwave charges 1.4% of the TOTAL transaction amount.
    // To ensure we receive the exact donationAmount after they take their cut,
    // we use the gross-up formula: Total = Amount / (1 - 0.014) = Amount / 0.986
    const totalNeeded = donationAmount / 0.986;
    const fee = Math.ceil(totalNeeded - donationAmount);
    return fee;
  }
  // Paystack
  const percentageFee = Math.round(donationAmount * 0.015);
  const flatFee = donationAmount > 2500 ? 100 : 0;
  return Math.min(percentageFee + flatFee, 2000);
};
