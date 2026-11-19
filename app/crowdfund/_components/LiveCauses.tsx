import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { listDiscoverResults } from "@/actions/causes/discover-actions";
import { formatNaira } from "@/components/giving/format";
import { Heading } from "@/components/marketing/Typography";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

import type { UseCase } from "../_data/use-cases";

export async function LiveCauses({ useCase }: { useCase: UseCase }) {
  const { items } = await listDiscoverResults(
    {
      categories: [useCase.categoryId],
      includeType: "campaigns",
      sortBy: "most-urgent",
    },
    { limit: 3, offset: 0 },
  );

  return (
    <div className="mt-20 border-t border-hairline pt-12 md:mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-3 block">Live on RefreeG</Eyebrow>
          <Heading as="h3" size="subsection">
            {items.length ? (
              <>
                Raising <em className="font-medium">right now.</em>
              </>
            ) : (
              <>
                Nothing live here <em className="font-medium">yet.</em>
              </>
            )}
          </Heading>
        </div>
        <Link
          href={
            items.length
              ? `/causes?category=${useCase.categoryId}`
              : `/dashboard/causes/create?category=${useCase.categoryId}`
          }
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-accent hover:opacity-80"
        >
          {items.length ? "View all" : "Be the first to raise here"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {items.length > 0 && (
        <ul className="-mx-4 mt-10 flex snap-x gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0">
          {items.map((item) => {
            const imageUrl = getMediaUrl(item.image) || "/live-donations.png";
            return (
              <li
                key={item.id}
                className="w-[80%] shrink-0 snap-start sm:w-auto"
              >
                <Link href={`/causes/${item.id}`} className="group block">
                  <div className="relative aspect-[760/577] overflow-hidden rounded-lg bg-bone">
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 80vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={isProxyMediaUrl(imageUrl)}
                    />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
                      Live
                    </span>
                  </div>
                  <Eyebrow className="mt-5 block font-normal">
                    {item.orgName}
                    {item.location ? ` · ${item.location}` : ""}
                  </Eyebrow>
                  <h4 className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-ink group-hover:underline">
                    {item.title}
                  </h4>
                  <Progress
                    value={item.percent}
                    indicatorVariant="blue"
                    aria-label={`${item.percent}% of goal raised`}
                    className="mt-5 h-1 rounded-none bg-cream-muted"
                  />
                  <div className="mt-3 flex items-baseline justify-between text-sm text-ink">
                    <span className="font-semibold">
                      {formatNaira(item.raised)} raised
                    </span>
                    <span>of {formatNaira(item.goal)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function LiveCausesSkeleton() {
  return (
    <div className="mt-20 border-t border-hairline pt-12 md:mt-28">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-10 w-64" />
      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="aspect-[760/577] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
