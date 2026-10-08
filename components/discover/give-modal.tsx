"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Clock3, CreditCard, Landmark, X } from "lucide-react";
import { Dialog, DialogClose, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { Button } from "@/components/ui/button";
import { CalloutBanner } from "@/components/ui/callout-banner";
import { Icons } from "@/components/icons";
import { getQuickDonateProps } from "@/actions/cause-actions";
import { usePayment } from "@/hooks/use-payment";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { calculateProviderFee, calculateServiceFee, cn } from "@/lib/utils";

type QuickDonateProps = NonNullable<
  Awaited<ReturnType<typeof getQuickDonateProps>>
>;
type Provider = "paystack" | "flutterwave";

const PRESETS = [2000, 5000, 10000];
const MIN_AMOUNT = 100;

const PROVIDERS: {
  id: Provider;
  label: string;
  detail: string;
  Icon: typeof CreditCard;
}[] = [
  {
    id: "paystack",
    label: "Card, transfer or USSD",
    detail: "Paystack",
    Icon: CreditCard,
  },
  {
    id: "flutterwave",
    label: "Card or bank transfer",
    detail: "Flutterwave",
    Icon: Landmark,
  },
];

const naira = (n: number) => `₦${n.toLocaleString()}`;
const label =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";

function GiveForm({ props }: { props: QuickDonateProps }) {
  const { initializePayment, isLoading } = usePayment();
  const [preset, setPreset] = useState<number | "other">(5000);
  const [other, setOther] = useState("");
  const [provider, setProvider] = useState<Provider>("paystack");
  const [name, setName] = useState(props.defaultName);
  const [email, setEmail] = useState(props.defaultEmail);
  const [error, setError] = useState("");

  const amount = preset === "other" ? Number(other) || 0 : preset;
  const fees =
    calculateServiceFee(amount) + calculateProviderFee(amount, provider);
  const imageUrl = getMediaUrl(props.causeImage) || "/placeholder.svg";
  const causeHref = `/causes/${props.causeSlug || props.causeId}`;
  const isGuest = !props.userId;

  const give = async () => {
    if (amount < MIN_AMOUNT) {
      setError(`The smallest gift is ${naira(MIN_AMOUNT)}.`);
      return;
    }
    if (!email.trim()) {
      setError("Add your email so we can send your receipt.");
      return;
    }
    setError("");
    try {
      await initializePayment({
        email: email.trim(),
        amount,
        causeId: props.causeId,
        id: props.userId || "",
        full_name: name.trim() || "Supporter",
        serviceFee: calculateServiceFee(amount),
        paymentProvider: provider,
        // Flutterwave needs its own sub-account; the server creates or looks
        // it up when none is sent. Never send the Paystack one there.
        subaccounts:
          provider === "paystack" && props.subaccount
            ? [{ subaccount: props.subaccount, share: amount * 100 }]
            : [],
        message: "",
        isAnonymous: props.defaultAnonymous,
      });
    } catch {
      // usePayment shows the toast.
    }
  };

  return (
    <div className="rounded-3xl bg-surface p-6 sm:p-7">
      <div className="flex items-start gap-4 border-b border-hairline pb-5">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-muted">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="56px"
            className="object-cover"
            unoptimized={isProxyMediaUrl(imageUrl)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-ink">
            {props.causeTitle}
          </p>
          <p className="mt-0.5 text-[13px] text-ink/55">
            {props.orgName}
            {props.orgVerified ? " · Verified NGO" : ""}
          </p>
          <Link
            href={causeHref}
            className="mt-1.5 inline-block text-[13px] font-semibold text-blue-accent hover:underline"
          >
            Read about this campaign
          </Link>
        </div>
        <DialogClose
          className="rounded-full p-1 text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </DialogClose>
      </div>

      <p className={cn(label, "mt-5")}>Amount</p>
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {[...PRESETS, "other" as const].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPreset(value);
              setError("");
            }}
            className={cn(
              "h-12 rounded-xl border text-[15px] font-semibold transition-colors",
              preset === value
                ? "border-ink bg-ink text-ink-foreground"
                : "border-hairline bg-surface text-ink hover:border-ink/30",
            )}
          >
            {value === "other" ? "Other" : `₦${value / 1000}k`}
          </button>
        ))}
      </div>
      {preset === "other" && (
        <input
          type="number"
          inputMode="numeric"
          min={MIN_AMOUNT}
          autoFocus
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Amount in naira"
          aria-label="Amount in naira"
          className="mt-2.5 h-12 w-full rounded-xl border border-hairline bg-bone px-4 text-[15px] text-ink outline-none focus:border-ink/40"
        />
      )}

      {isGuest && (
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="h-11 rounded-xl border border-hairline bg-bone px-4 text-sm text-ink outline-none focus:border-ink/40"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email for your receipt"
            aria-label="Email for your receipt"
            className="h-11 rounded-xl border border-hairline bg-bone px-4 text-sm text-ink outline-none focus:border-ink/40"
          />
        </div>
      )}

      <p className={cn(label, "mt-5")}>Pay with</p>
      <div className="mt-3 space-y-2.5" role="radiogroup" aria-label="Pay with">
        {PROVIDERS.map(({ id, label: title, detail, Icon }) => {
          const selected = provider === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setProvider(id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors",
                selected
                  ? "border-blue-accent bg-blue-accent/[0.03]"
                  : "border-hairline hover:border-ink/30",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  selected
                    ? "bg-ink text-ink-foreground"
                    : "bg-bone text-ink/70",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{title}</span>
                <span className="block text-[13px] text-ink/55">{detail}</span>
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border",
                  selected
                    ? "border-blue-accent bg-blue-accent text-white"
                    : "border-hairline",
                )}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 text-sm font-medium text-rust" role="alert">
          {error}
        </p>
      )}

      <Button
        variant="ink"
        onClick={give}
        disabled={isLoading || amount < MIN_AMOUNT}
        className="mt-6 h-14 w-full rounded-2xl text-base font-semibold shadow-[0_10px_24px_-10px_hsl(var(--ink)/0.6)]"
      >
        {isLoading ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Opening payment…
          </>
        ) : (
          `Give ${amount >= MIN_AMOUNT ? naira(amount) : ""}`.trim()
        )}
      </Button>
      {amount >= MIN_AMOUNT && fees > 0 && (
        <p className="mt-2 text-center text-xs text-ink/55">
          {naira(amount + fees)} total, including {naira(fees)} in fees
        </p>
      )}
      <p className="mt-4 text-center text-[13px] text-ink/55">
        Your gift goes to {props.orgName}, who post proof of how it&apos;s
        spent.
      </p>
    </div>
  );
}

export function GiveModal({
  causeId,
  open,
  onOpenChange,
}: {
  causeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [props, setProps] = useState<QuickDonateProps | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    getQuickDonateProps(causeId).then((result) => {
      if (!cancelled) {
        setProps(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, causeId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[92vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-none bg-transparent p-0 shadow-none sm:max-w-[452px] [&>button]:hidden">
        <DialogTitle className="sr-only">Give to this campaign</DialogTitle>
        {loading || !props ? (
          <div
            className="space-y-4 rounded-3xl bg-surface p-7"
            aria-busy="true"
          >
            <div className="h-14 w-2/3 rounded-xl bg-cream-muted" />
            <div className="h-12 w-full rounded-xl bg-cream-muted" />
            <div className="h-28 w-full rounded-xl bg-cream-muted" />
            <div className="h-14 w-full rounded-2xl bg-cream-muted" />
          </div>
        ) : props.paused ? (
          <div className="rounded-3xl bg-surface p-7">
            <CalloutBanner
              variant="gold"
              icon={<Clock3 className="mt-0.5 h-5 w-5 shrink-0" />}
              title="This campaign is paused"
              description="Its owner is updating the campaign details — donations are on hold until that's reviewed and approved."
            />
          </div>
        ) : (
          <GiveForm props={props} />
        )}
      </ResponsiveDialogContent>
    </Dialog>
  );
}
