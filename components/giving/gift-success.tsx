"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { formatNairaShort } from "@/lib/discover-summary";
import type { GiftCause, GiftDetails } from "@/actions/gift-actions";

const percentOf = (c: GiftCause) =>
  c.goal > 0 ? Math.min(Math.round((c.raised / c.goal) * 100), 100) : 0;

function RelatedCard({ cause }: { cause: GiftCause }) {
  return (
    <Link
      href={cause.href}
      className="block rounded-2xl bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <h3 className="font-fraunces text-xl leading-snug text-ink">
        {cause.title}
      </h3>
      <Progress
        value={percentOf(cause)}
        indicatorVariant="cyan"
        aria-label={`${percentOf(cause)}% funded`}
        className="mt-3 h-1.5 bg-cream-muted"
      />
      <p className="mt-2.5 text-xs text-ink/55">
        {formatNairaShort(cause.raised)} of {formatNairaShort(cause.goal)} ·{" "}
        {cause.orgName}
      </p>
    </Link>
  );
}

export function GiftSuccess({ gift }: { gift: GiftDetails }) {
  const [shared, setShared] = useState(false);
  const { cause } = gift;
  const percent = percentOf(cause);
  const toGo = Math.max(cause.goal - cause.raised, 0);
  const others = gift.giftCount - 1;
  const paidAt = new Date(gift.paidAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const imageUrl = getMediaUrl(cause.image) || "/placeholder.svg";

  const share = async () => {
    const url = `${window.location.origin}${cause.href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: cause.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="flex gap-5 rounded-3xl border border-forest/15 bg-forest/[0.06] p-6 sm:p-7">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-lime">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <h1 className="font-fraunces text-3xl tracking-tight text-ink sm:text-[34px]">
            ₦{gift.amount.toLocaleString()} is with {cause.orgName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/70">
            Paid at {paidAt}. {cause.title} is now at {percent}% of{" "}
            {formatNairaShort(cause.goal)}. You will get an email when{" "}
            {cause.orgName} shows how the money was spent, with the receipts
            behind it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href={`/receipt/${encodeURIComponent(gift.reference)}`}>
              <Button
                variant="ink"
                className="h-12 rounded-2xl px-5 font-semibold"
              >
                See your receipt
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={share}
              className="h-12 rounded-2xl border-hairline bg-surface px-5 font-semibold text-ink hover:bg-bone"
            >
              {shared ? "Link copied" : "Share the campaign"}
            </Button>
          </div>
        </div>
      </section>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.27fr)_minmax(0,1fr)]">
        <Link
          href={cause.href}
          className="block overflow-hidden rounded-2xl bg-surface transition-shadow hover:shadow-md"
        >
          <div className="relative aspect-[3.1/1] w-full bg-cream-muted">
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              unoptimized={isProxyMediaUrl(imageUrl)}
            />
          </div>
          <div className="p-5 sm:p-6">
            <h2 className="font-fraunces text-2xl text-ink">{cause.title}</h2>
            <Progress
              value={percent}
              indicatorVariant="cyan"
              aria-label={`${percent}% funded`}
              className="mt-4 h-1.5 bg-cream-muted"
            />
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-ink/60">
                <span className="font-semibold text-ink">
                  {formatNairaShort(cause.raised)}
                </span>{" "}
                of {formatNairaShort(cause.goal)}
              </span>
              <span className="text-ink/55">
                {others > 0
                  ? `You and ${others.toLocaleString()} ${others === 1 ? "other" : "others"}`
                  : "You're the first to give"}
              </span>
            </div>
            {toGo > 0 && (
              <p className="mt-4 text-sm text-ink/70">
                {formatNairaShort(toGo)} to go.
              </p>
            )}
          </div>
        </Link>

        {gift.related.length > 0 && (
          <aside>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">
              Others like this one
            </p>
            <div className="mt-3 space-y-3">
              {gift.related.map((c) => (
                <RelatedCard key={c.id} cause={c} />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
