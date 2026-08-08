"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePayment } from "@/hooks/use-payment";
import { Icons } from "@/components/icons";
import type { PaymentProviderType, TransactionData } from "@/types";

export default function PaymentProviderSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initializePayment, isLoading } = usePayment();
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProviderType | null>(null);

  // Read the transaction data from sessionStorage (set by the donation form)
  const [txData, setTxData] = useState<TransactionData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_payment_data");
    if (!stored) {
      // No payment data — redirect back
      const causeId = searchParams.get("causeId");
      router.replace(causeId ? `/causes/${causeId}` : "/causes");
      return;
    }
    setTxData(JSON.parse(stored));
  }, [router, searchParams]);

  const handleSelectProvider = async (provider: PaymentProviderType) => {
    if (!txData || isLoading) return;
    setSelectedProvider(provider);

    try {
      const data = { ...txData, paymentProvider: provider };

      // If Flutterwave, swap the subaccount to the Flutterwave subaccount ID
      if (
        provider === "flutterwave" &&
        (txData as any)._flutterwaveSubAccountId
      ) {
        data.subaccounts = [
          {
            subaccount: (txData as any)._flutterwaveSubAccountId,
            share: data.subaccounts?.[0]?.share || data.amount * 100,
          },
        ];
      }

      await initializePayment(data);
    } catch {
      // Error is handled by the hook (toast)
      setSelectedProvider(null);
    }
  };

  if (!txData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Icons.spinner className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Choose Payment Method
        </h1>
        <p className="mb-10 text-sm text-gray-500">
          Select how you&apos;d like to complete your ₦
          {(
            txData.amount +
            txData.serviceFee +
            (txData.tipAmount || 0)
          ).toLocaleString()}{" "}
          donation
        </p>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8">
          {/* Paystack Button */}
          <button
            onClick={() => handleSelectProvider("paystack")}
            disabled={isLoading}
            className="group relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-sm transition-all hover:border-[#00C3F7] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00C3F7] focus:ring-offset-2 disabled:opacity-50 sm:h-36 sm:w-36"
          >
            {selectedProvider === "paystack" && isLoading ? (
              <Icons.spinner className="h-8 w-8 animate-spin text-[#00C3F7]" />
            ) : (
              <>
                <svg
                  viewBox="0 0 80 80"
                  className="mb-2 h-10 w-10 sm:h-12 sm:w-12"
                  fill="none"
                >
                  <rect width="80" height="80" rx="16" fill="#00C3F7" />
                  <path
                    d="M20 24h40v6H20v-6zm0 12h32v6H20v-6zm0 12h40v6H20v-6zm0 12h24v6H20v-6z"
                    fill="white"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700 group-hover:text-[#00C3F7]">
                  Paystack
                </span>
              </>
            )}
          </button>

          {/* Flutterwave Button */}
          <button
            onClick={() => handleSelectProvider("flutterwave")}
            disabled={isLoading}
            className="group relative flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-sm transition-all hover:border-[#F5A623] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 disabled:opacity-50 sm:h-36 sm:w-36"
          >
            {selectedProvider === "flutterwave" && isLoading ? (
              <Icons.spinner className="h-8 w-8 animate-spin text-[#F5A623]" />
            ) : (
              <>
                <svg
                  viewBox="0 0 80 80"
                  className="mb-2 h-10 w-10 sm:h-12 sm:w-12"
                  fill="none"
                >
                  <rect width="80" height="80" rx="16" fill="#F5A623" />
                  <path
                    d="M24 56c0-17.673 14.327-32 32-32v8c-13.255 0-24 10.745-24 24h-8z"
                    fill="white"
                  />
                  <circle cx="52" cy="28" r="6" fill="white" />
                </svg>
                <span className="text-sm font-medium text-gray-700 group-hover:text-[#F5A623]">
                  Flutterwave
                </span>
              </>
            )}
          </button>
        </div>

        <button
          onClick={() => router.back()}
          className="mt-10 text-sm text-gray-400 underline hover:text-gray-600"
          disabled={isLoading}
        >
          Go back
        </button>
      </div>
    </div>
  );
}
