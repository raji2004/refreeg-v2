"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePayment } from "@/hooks/use-payment";
import { Icons } from "@/components/icons";
import Image from "next/image";
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

      // If Flutterwave, swap the subaccount to the Flutterwave subaccount ID, or clear it if none
      if (provider === "flutterwave") {
        if ((txData as any)._flutterwaveSubAccountId) {
          data.subaccounts = [
            {
              subaccount: (txData as any)._flutterwaveSubAccountId,
              share: data.subaccounts?.[0]?.share || data.amount * 100,
            },
          ];
        } else {
          // DO NOT send Paystack subaccount IDs to Flutterwave!
          data.subaccounts = [];
        }
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
            className="group relative flex h-32 w-48 flex-col items-center justify-center rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#00C3F7] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00C3F7] focus:ring-offset-2 disabled:opacity-50 sm:h-36 sm:w-56 lg:h-48 lg:w-72"
          >
            {selectedProvider === "paystack" && isLoading ? (
              <Icons.spinner className="h-8 w-8 animate-spin text-[#00C3F7]" />
            ) : (
              <Image
                src="/paystack.png"
                alt="Paystack"
                width={160}
                height={60}
                className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
              />
            )}
          </button>

          {/* Flutterwave Button */}
          <button
            onClick={() => handleSelectProvider("flutterwave")}
            disabled={isLoading}
            className="group relative flex h-32 w-48 flex-col items-center justify-center rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-[#F5A623] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:ring-offset-2 disabled:opacity-50 sm:h-36 sm:w-56 lg:h-48 lg:w-72"
          >
            {selectedProvider === "flutterwave" && isLoading ? (
              <Icons.spinner className="h-8 w-8 animate-spin text-[#F5A623]" />
            ) : (
              <Image
                src="/flutterwave.png"
                alt="Flutterwave"
                width={160}
                height={60}
                className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
              />
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
