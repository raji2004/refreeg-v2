"use client";

import Link from "next/link";
import Image from "next/image";
import { Bookmark, Flag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { formatNairaShort } from "@/lib/discover-summary";
import type { DiscoverItem } from "@/actions/discover-actions";

type CardProps = {
  item: DiscoverItem;
  view: "grid" | "list";
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onGiveClick: () => void;
  onPledgeClick: () => void;
  onSignClick: () => void;
};

const AVATAR_TONES = [
  "bg-lime text-ink",
  "bg-ink text-ink-foreground",
  "bg-rust text-rust-foreground",
  "bg-forest text-white",
  "bg-cyan text-ink",
];

function OrgAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "RG";
  const tone =
    AVATAR_TONES[
      [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
        AVATAR_TONES.length
    ];
  return (
    <span
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[8px] font-bold",
        tone,
      )}
    >
      {initials}
    </span>
  );
}

/** Stops the click reaching the card's link. */
const stop = (fn: () => void) => (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  fn();
};

/** One status chip, highest priority first. */
function statusChip(item: DiscoverItem, tone: "solid" | "soft") {
  const solid = tone === "solid";
  if (item.paused)
    return { label: "Paused", className: "bg-gold text-gold-foreground" };
  if (item.urgent && item.daysLeft != null)
    return {
      label: solid
        ? `Urgent · ${item.daysLeft} ${item.daysLeft === 1 ? "day" : "days"}`
        : "Urgent",
      className: solid ? "bg-rust text-white" : "bg-rust/10 text-rust",
    };
  if (item.percent >= 90 && item.percent < 100)
    return {
      label: `${item.percent}% funded`,
      className: solid ? "bg-forest text-lime" : "bg-forest/10 text-forest",
    };
  return null;
}

const CHIP =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider";

const giftsLabel = (item: DiscoverItem) =>
  item.giftCount
    ? `${item.giftCount.toLocaleString()} gave`
    : "Be the first to give";

const hrefFor = (item: DiscoverItem) =>
  item.type === "campaign" ? `/causes/${item.id}` : `/petitions/${item.id}`;

function CampaignActions({
  item,
  onGiveClick,
  onPledgeClick,
  className,
}: Pick<CardProps, "item" | "onGiveClick" | "onPledgeClick"> & {
  className?: string;
}) {
  if (item.paused) {
    return (
      <div className={className}>
        <Button variant="outline" disabled className="h-10 w-full rounded-xl">
          Paused
        </Button>
      </div>
    );
  }
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant="ink"
        className="h-10 flex-1 rounded-xl text-sm font-semibold"
        onClick={stop(onGiveClick)}
      >
        Give now
      </Button>
      <Button
        variant="outline"
        className="h-10 rounded-xl border-hairline bg-surface px-5 text-sm font-semibold text-ink hover:bg-bone"
        onClick={stop(onPledgeClick)}
      >
        Pledge
      </Button>
    </div>
  );
}

function BookmarkButton({
  bookmarked,
  onToggleBookmark,
}: Pick<CardProps, "bookmarked" | "onToggleBookmark">) {
  return (
    <button
      type="button"
      onClick={stop(onToggleBookmark)}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove from saved" : "Save"}
      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm transition-colors hover:bg-surface"
    >
      <Bookmark
        className="h-3.5 w-3.5"
        fill={bookmarked ? "currentColor" : "none"}
      />
    </button>
  );
}

function PetitionGridCard({ item, onSignClick }: CardProps) {
  return (
    <Link
      href={hrefFor(item)}
      className="group flex h-full flex-col rounded-2xl bg-sand p-5 transition-shadow hover:shadow-lg"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber">
        <Flag className="h-3.5 w-3.5" />
        Petition
      </span>
      <h2 className="mt-3 line-clamp-4 font-fraunces text-[22px] leading-tight text-ink group-hover:underline">
        {item.title}
      </h2>
      <div className="mt-auto pt-6">
        <Progress
          value={item.percent}
          aria-label={`${item.percent}% of signature goal`}
          className="h-1.5 bg-ink/10"
          indicatorClassName="bg-ink"
        />
        <p className="mt-2 text-xs text-ink/70">
          {item.raised.toLocaleString()} of {item.goal.toLocaleString()}{" "}
          signatures
        </p>
        <Button
          variant="ink"
          className="mt-4 h-10 w-full rounded-xl text-sm font-semibold"
          onClick={stop(onSignClick)}
        >
          Sign this petition
        </Button>
      </div>
    </Link>
  );
}

function CampaignGridCard(props: CardProps) {
  const { item } = props;
  const imageUrl = getMediaUrl(item.image) || "/placeholder.svg";
  const chip = statusChip(item, "solid");

  return (
    <Link
      href={hrefFor(item)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition-shadow hover:shadow-lg focus-visible:shadow-lg"
    >
      <div className="relative aspect-[2.15/1] w-full shrink-0 overflow-hidden bg-cream-muted">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
          unoptimized={isProxyMediaUrl(imageUrl)}
        />
        {chip && (
          <span className={cn(CHIP, "absolute left-3 top-3", chip.className)}>
            {chip.label}
          </span>
        )}
        <BookmarkButton {...props} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 font-fraunces text-[19px] leading-snug text-ink">
          {item.title}
        </h2>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink/60">
          <OrgAvatar name={item.orgName} />
          <span className="truncate">{item.orgName}</span>
          {item.verified && (
            <ShieldCheck
              className="h-3.5 w-3.5 shrink-0 text-forest"
              aria-label="Verified"
            />
          )}
        </div>
        <Progress
          value={item.percent}
          aria-label={`${item.percent}% funded`}
          indicatorVariant="cyan"
          className="mt-3 h-1.5 bg-cream-muted"
        />
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className="text-ink/60">
            <span className="font-semibold text-ink">
              {formatNairaShort(item.raised)}
            </span>{" "}
            of {formatNairaShort(item.goal)}
          </span>
          <span className="text-ink/55">{giftsLabel(item)}</span>
        </div>
        <CampaignActions {...props} className="mt-auto pt-4" />
      </div>
    </Link>
  );
}

function ListRow(props: CardProps) {
  const { item } = props;
  const imageUrl = getMediaUrl(item.image) || "/placeholder.svg";
  const chip = statusChip(item, "soft");
  const isCampaign = item.type === "campaign";
  const toGo = Math.max(item.goal - item.raised, 0);
  const meta = isCampaign
    ? [
        item.orgName,
        item.verified && "Verified NGO",
        giftsLabel(item),
        item.daysLeft != null && `${item.daysLeft} days left`,
      ]
    : [item.orgName, "Petition"];

  return (
    <Link
      href={hrefFor(item)}
      className="group flex items-center gap-4 rounded-2xl bg-surface p-3.5 transition-shadow hover:shadow-md"
    >
      <div className="relative h-[78px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-cream-muted">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="104px"
          className="object-cover"
          unoptimized={isProxyMediaUrl(imageUrl)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="truncate font-fraunces text-xl text-ink">
            {item.title}
          </h2>
          {chip && (
            <span className={cn(CHIP, chip.className)}>{chip.label}</span>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-ink/60">
          {meta.filter(Boolean).join(" · ")}
        </p>
        <Progress
          value={item.percent}
          aria-label={`${item.percent}% ${isCampaign ? "funded" : "of signature goal"}`}
          indicatorVariant={isCampaign ? "cyan" : "default"}
          indicatorClassName={isCampaign ? undefined : "bg-ink"}
          className="mt-2.5 h-1.5 max-w-[440px] bg-cream-muted"
        />
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-3 sm:flex">
        <p className="text-sm font-semibold text-ink">
          {isCampaign
            ? `${formatNairaShort(toGo)} to go`
            : `${item.raised.toLocaleString()} of ${item.goal.toLocaleString()} signed`}
        </p>
        {isCampaign ? (
          item.paused ? (
            <Button variant="outline" disabled className="h-10 rounded-xl">
              Paused
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-hairline bg-surface px-4 text-sm font-semibold text-ink hover:bg-bone"
                onClick={stop(props.onPledgeClick)}
              >
                Pledge
              </Button>
              <Button
                variant="ink"
                className="h-10 rounded-xl px-4 text-sm font-semibold"
                onClick={stop(props.onGiveClick)}
              >
                Give now
              </Button>
            </div>
          )
        ) : (
          <Button
            variant="ink"
            className="h-10 rounded-xl px-4 text-sm font-semibold"
            onClick={stop(props.onSignClick)}
          >
            Sign
          </Button>
        )}
      </div>
    </Link>
  );
}

export function DiscoverCard(props: CardProps) {
  if (props.view === "list") return <ListRow {...props} />;
  return props.item.type === "petition" ? (
    <PetitionGridCard {...props} />
  ) : (
    <CampaignGridCard {...props} />
  );
}

/** Placeholder card while results load. */
export function DiscoverCardSkeleton({
  tone = "surface",
}: {
  tone?: "surface" | "sand";
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl",
        tone === "sand" ? "bg-sand/60" : "bg-surface",
      )}
      aria-hidden="true"
    >
      {tone === "surface" && (
        <div className="aspect-[2.15/1] w-full bg-cream-muted/70" />
      )}
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 rounded-full bg-cream-muted" />
        <div className="h-4 w-1/2 rounded-full bg-cream-muted" />
        <div className="h-3 w-2/5 rounded-full bg-cream-muted" />
        <div className="h-1.5 w-full rounded-full bg-cream-muted" />
        <div className="flex justify-between">
          <div className="h-3 w-1/3 rounded-full bg-cream-muted" />
          <div className="h-3 w-1/5 rounded-full bg-cream-muted" />
        </div>
      </div>
    </div>
  );
}
