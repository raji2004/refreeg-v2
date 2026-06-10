import Link from "next/link";

import { ANNOUNCEMENT_PLACEHOLDER_ITEMS, mapLiveRecordsToAnnouncementItems } from "@/lib/announcement-feed";
import { cn } from "@/lib/utils";
import { AnnouncementItem, AnnouncementStatus, LiveAnnouncementRecord } from "@/types/announcement";

interface AnnouncementMarqueeProps {
  items?: AnnouncementItem[];
  liveRecords?: LiveAnnouncementRecord[];
  speedSeconds?: number;
  className?: string;
  ariaLabel?: string;
  usePlaceholderWhenEmpty?: boolean;
}

const statusLabels: Record<AnnouncementStatus, string> = {
  live: "LIVE",
  verified: "VERIFIED",
  settled: "SETTLED",
  paused: "PAUSED",
};

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function AnnouncementStatusTag({ status }: { status: AnnouncementStatus }) {
  return (
    <span className="font-semibold text-[11px] tracking-[0.26em] text-[hsl(var(--announcement-status))]">
      {statusLabels[status]}
    </span>
  );
}

export function AnnouncementTickerItem({ item }: { item: AnnouncementItem }) {
  const content = (
    <>
      <AnnouncementStatusTag status={item.status} />
      <span className="font-semibold text-[hsl(var(--announcement-foreground))]">
        {formatAmount(item.amount, item.currency)}
      </span>
      <span aria-hidden="true" className="font-semibold text-[hsl(var(--announcement-foreground))]">
        →
      </span>
      <span className="font-medium text-[hsl(var(--announcement-foreground))]">{item.headline}</span>
      {item.reference ? (
        <span className="font-medium text-[hsl(var(--announcement-foreground))]">• {item.reference}</span>
      ) : null}
    </>
  );

  if (!item.href) {
    return <div className="flex items-center gap-3 whitespace-nowrap px-8 py-3">{content}</div>;
  }

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 whitespace-nowrap px-8 py-3 transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--announcement-foreground))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--announcement-background))]"
    >
      {content}
    </Link>
  );
}

export function AnnouncementMarquee({
  items,
  liveRecords,
  speedSeconds = 44,
  className,
  ariaLabel = "Platform announcements",
  usePlaceholderWhenEmpty = true,
}: AnnouncementMarqueeProps) {
  const mappedLiveItems = liveRecords?.length
    ? mapLiveRecordsToAnnouncementItems(liveRecords)
    : [];

  const resolvedItems =
    items && items.length > 0
      ? items
      : mappedLiveItems.length > 0
        ? mappedLiveItems
        : usePlaceholderWhenEmpty
          ? ANNOUNCEMENT_PLACEHOLDER_ITEMS
          : [];

  if (!resolvedItems.length) {
    return null;
  }

  const marqueeItems = [...resolvedItems, ...resolvedItems];

  return (
    <section
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "relative overflow-hidden border-y border-[hsl(var(--announcement-border))] bg-[hsl(var(--announcement-background))]",
        className,
      )}
    >
      <ul
        className="flex w-max items-center animate-announcement-marquee hover:[animation-play-state:paused]"
        style={{ ["--marquee-duration" as string]: `${Math.max(speedSeconds, 12)}s` }}
      >
        {marqueeItems.map((item, index) => (
          <li key={`${item.id}-${index}`} className="list-none">
            <AnnouncementTickerItem item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
