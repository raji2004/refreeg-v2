"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { usePayment } from "@/hooks/use-payment";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Eyebrow } from "@/components/ui/eyebrow";
import { calculateProviderFee } from "@/lib/utils";
import Image from "next/image";
import type { PaymentProviderType, TransactionData } from "@/types";

export default function PaymentProviderSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { initializePayment, isLoading } = usePayment();
  const [selectedProvider, setSelectedProvider] =
    useState<PaymentProviderType | null>(null);

  const [txData, setTxData] = useState<TransactionData | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("pending_payment_data");
    if (!stored) {
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
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Icons.spinner className="h-8 w-8 animate-spin text-ink/40" />
      </div>
    );
  }

  const total =
    txData.amount +
    txData.serviceFee +
    (txData.providerFee || 0) +
    (txData.tipAmount || 0);

  const providers: { id: PaymentProviderType; name: string; logo: string }[] = [
    { id: "paystack", name: "Paystack", logo: "/paystack.png" },
    { id: "flutterwave", name: "Flutterwave", logo: "/flutterwave.png" },
  ];
  const pendingName = providers.find((p) => p.id === selectedProvider)?.name;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-2xl text-center">
        <Eyebrow>Choose payment method</Eyebrow>
        <p className="mt-3 font-fraunces text-4xl font-medium text-ink sm:text-5xl">
          ₦{total.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Pick how you&apos;d like to complete this donation.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleSelectProvider(provider.id)}
              disabled={isLoading}
              aria-label={`Pay with ${provider.name}`}
              className="group flex h-32 items-center justify-center rounded-xl border border-hairline bg-surface p-4 shadow-subtle transition-colors hover:border-forest hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:opacity-50 sm:h-40"
            >
              {selectedProvider === provider.id && isLoading ? (
                <Icons.spinner className="h-8 w-8 animate-spin text-forest" />
              ) : (
                <Image
                  src={provider.logo}
                  alt={provider.name}
                  width={160}
                  height={60}
                  className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                />
              )}
            </button>
          ))}
        </div>

        {isLoading && pendingName && (
          <p className="mt-4 text-sm text-ink/70" role="status">
            Taking you to {pendingName} to finish paying. This usually takes a
            few seconds.
          </p>
        )}

        {calculateProviderFee(txData.amount, "flutterwave") > 2000 && (
          <CalloutBanner
            variant="sand"
            className="mt-8 text-left"
            title="Processing fees differ on large donations"
            description={
              <>
                <strong>Paystack</strong> caps its processing fee at ₦2,000.{" "}
                <strong>Flutterwave</strong> charges a flat 1.4% with no upper
                limit.
              </>
            }
          />
        )}

        <Button
          type="button"
          variant="link"
          onClick={() => router.back()}
          disabled={isLoading}
          className="mt-8 text-ink/60 hover:text-ink"
        >
          Go back
        </Button>
      </div>
    </div>
  );
}
