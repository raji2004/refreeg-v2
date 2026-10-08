"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { Button } from "@/components/ui/button";
import { usePayment } from "@/hooks/use-payment";
import { getGiftByReference, type GiftDetails } from "@/actions/gift-actions";
import { GiftSuccess } from "@/components/giving/gift-success";

const PROVIDER_NAMES: Record<string, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
};

/** The donation row can land a moment after the provider redirects back. */
async function loadGift(reference: string, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    const gift = await getGiftByReference(reference).catch(() => null);
    if (gift) return gift;
    await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

export default function PaymentVerification({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [reference] = useQueryState("reference");
  const [txRef] = useQueryState("tx_ref");
  const [transactionId] = useQueryState("transaction_id");
  const [providerQuery] = useQueryState("provider");
  const { verifyPayment } = usePayment();
  const [status, setStatus] = useState<"loading" | "success" | "failed">(
    "loading",
  );
  const [gift, setGift] = useState<GiftDetails | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [declined, setDeclined] = useState<{
    amount: number | null;
    provider: string;
  }>({ amount: null, provider: "Paystack" });

  useEffect(() => {
    const finalReference = reference || txRef;
    if (hasVerified) return;
    if (!finalReference) {
      setStatus("failed");
      return;
    }
    setHasVerified(true);

    const readPending = () => {
      try {
        const amount = Number(localStorage.getItem("payment_amount"));
        const provider =
          (providerQuery as string) ||
          localStorage.getItem("payment_provider") ||
          "paystack";
        setDeclined({
          amount: Number.isFinite(amount) && amount > 0 ? amount : null,
          provider: PROVIDER_NAMES[provider] ?? "Paystack",
        });
      } catch {}
    };

    (async () => {
      try {
        const ok = await verifyPayment(
          finalReference,
          providerQuery as any,
          transactionId || undefined,
        );
        if (!ok) {
          readPending();
          setStatus("failed");
          return;
        }
        setGift(await loadGift(finalReference));
        setStatus("success");
        try {
          localStorage.removeItem("payment_amount");
        } catch {}
      } catch {
        readPending();
        setStatus("failed");
      }
    })();
  }, [
    reference,
    txRef,
    providerQuery,
    transactionId,
    verifyPayment,
    hasVerified,
  ]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-ink/60" />
        <p className="font-fraunces text-2xl text-ink">Confirming your gift</p>
        <p className="text-sm text-ink/60">
          This usually takes a few seconds. Please keep this page open.
        </p>
      </div>
    );
  }

  if (status === "success" && gift) return <GiftSuccess gift={gift} />;

  if (status === "success") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-surface p-7 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-lime">
            <Check className="h-6 w-6" strokeWidth={2.5} />
          </span>
          <h1 className="mt-5 font-fraunces text-3xl text-ink">
            Your gift went through
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            It will appear in My giving with its receipt in a moment.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link href="/dashboard/donations">
              <Button variant="ink" className="h-12 w-full rounded-2xl">
                Go to My giving
              </Button>
            </Link>
            <Link href={`/causes/${id}`}>
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-hairline bg-surface text-ink hover:bg-bone"
              >
                Back to the campaign
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-[452px] rounded-3xl bg-surface p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rust/10 text-rust">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h1 className="mt-5 font-fraunces text-3xl tracking-tight text-ink">
          Your payment didn&apos;t go through
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          {declined.provider} didn&apos;t confirm this payment, so the campaign
          has not been credited. If money did leave your account, the gift will
          show in My giving once it clears.
        </p>
        {declined.amount && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-bone px-4 py-3.5 text-sm">
            <span className="text-ink/70">Gift</span>
            <span className="font-semibold text-ink">
              ₦{declined.amount.toLocaleString()}
            </span>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <Link href={`/causes/${id}/donate`}>
            <Button
              variant="ink"
              className="h-12 w-full rounded-2xl font-semibold"
            >
              Try another card
            </Button>
          </Link>
          <Link href={`/causes/${id}`}>
            <Button
              variant="outline"
              className="h-12 w-full rounded-2xl border-hairline bg-surface font-semibold text-ink hover:bg-bone"
            >
              Cancel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
