"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { listCauses } from "@/actions";
import { sortCausesByFunding } from "@/lib/causes/funding-rank";
import { causePublicPath } from "@/lib/causes/slug";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type Spotlight = {
  title: string;
  category: string;
  location: string;
  raised: number;
  goal: number;
  image: string;
  href: string;
};

const FALLBACK_IMAGE = "/live-donations.png";

const formatNaira = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

export function LiveSpotlight() {
  const [cause, setCause] = useState<Spotlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listCauses()
      .then((causes) => {
        const top = sortCausesByFunding(causes)[0];
        if (cancelled || !top) return;
        setCause({
          title: top.title,
          category: top.category || "Cause",
          location: top.location || "",
          raised: top.raised ?? 0,
          goal: top.goal ?? 0,
          image: getMediaUrl(top.image) || FALLBACK_IMAGE,
          href: causePublicPath(top),
        });
      })
      .catch((error) => console.error("Failed to load spotlight cause:", error))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && !cause) return null;

  const percent =
    cause && cause.goal > 0 ? (cause.raised / cause.goal) * 100 : 0;

  return (
    <section className="bg-surface py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-[1.4fr_1fr] md:gap-x-12 md:gap-y-10 lg:px-8">
        <div>
          <Eyebrow className="mb-3 block">Live on RefreeG</Eyebrow>
          <h2 className="font-fraunces text-4xl font-normal leading-[1.05] text-ink md:text-5xl">
            Real causes. Real <em className="font-medium">receipts.</em>
          </h2>
        </div>

        <p className="max-w-sm text-sm leading-relaxed text-ink md:pt-6">
          A glimpse of what&apos;s funding right now. Each campaign is verified,
          every naira tracked from contribution to impact.
        </p>

        {!cause ? (
          <>
            <Skeleton className="aspect-[760/577] rounded-lg" />
            <div className="flex flex-col justify-center gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-16 w-full max-w-xs" />
              <Skeleton className="h-1 w-full max-w-sm" />
            </div>
          </>
        ) : (
          <>
            <Link
              href={cause.href}
              className="group relative block aspect-[760/577] overflow-hidden rounded-lg bg-bone"
            >
              <Image
                src={cause.image}
                alt={cause.title}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized={isProxyMediaUrl(cause.image)}
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
                Live
              </span>
            </Link>

            <div className="flex flex-col justify-center">
              <Eyebrow className="mb-4 block font-normal">
                {cause.category}
                {cause.location ? ` · ${cause.location}` : ""}
              </Eyebrow>
              <Link href={cause.href} className="hover:underline">
                <h3 className="mb-8 max-w-xs text-xl font-semibold leading-snug text-ink md:text-2xl">
                  {cause.title}
                </h3>
              </Link>
              <Progress
                value={percent}
                indicatorVariant="blue"
                aria-label={`${Math.round(percent)}% of goal raised`}
                className="mb-3 h-1 max-w-sm rounded-none bg-cream-muted"
              />
              <div className="flex max-w-sm items-baseline justify-between text-sm text-ink">
                <span className="font-semibold">
                  {formatNaira(cause.raised)} raised
                </span>
                <span>of {formatNaira(cause.goal)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
