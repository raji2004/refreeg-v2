"use client";

import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Bookmark, Clock, HandHeart, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { DiscoverItem } from "@/actions/discover-actions";

/**
 * Discover's merged campaign+petition card. `DiscoverItem` is a deliberately
 * slim projection (no category/summary/full Cause fields), so this renders
 * from it directly rather than reusing `CauseCard`/`PetitionCard`, which
 * expect the full `Cause`/petition shape.
 */
export function DiscoverCard({
  item,
  view,
  bookmarked,
  onToggleBookmark,
  onGiveClick,
  onPledgeClick,
  onSignClick,
}: {
  item: DiscoverItem;
  view: "grid" | "list";
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onGiveClick: () => void;
  onPledgeClick: () => void;
  onSignClick: () => void;
}) {
  const href = item.type === "campaign" ? `/causes/${item.id}` : `/petitions/${item.id}`;
  const imageUrl = getMediaUrl(item.image) || "/placeholder.svg";

  return (
    <Link href={href} className={cn("group block", view === "list" && "w-full")}>
      <Card
        variant="outlined"
        className={cn(
          "h-full overflow-hidden transition-shadow hover:shadow-md",
          view === "list" ? "flex flex-row" : "flex flex-col",
        )}
      >
        <div
          className={cn(
            "relative shrink-0 overflow-hidden bg-ink/5",
            view === "list" ? "h-32 w-32 sm:h-36 sm:w-48" : "aspect-video w-full",
          )}
        >
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={isProxyMediaUrl(imageUrl)}
          />
          <span className="absolute left-3 top-3 rounded-full border border-ink/15 bg-cream/90 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur-sm">
            {item.type === "campaign" ? "Campaign" : "Petition"}
          </span>
          {item.paused ? (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gold/90 px-2.5 py-1 text-xs font-medium text-ink">
              <Clock className="h-3 w-3" />
              Paused
            </span>
          ) : item.urgent ? (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-gold/90 px-2.5 py-1 text-xs font-medium text-ink">
              <Clock className="h-3 w-3" />
              {item.daysLeft} {item.daysLeft === 1 ? "day" : "days"} left
            </span>
          ) : null}
          {!item.paused && !item.urgent && item.percent >= 90 && item.percent < 100 && (
            <span className="absolute right-3 top-3 rounded-full bg-lime/90 px-2.5 py-1 text-xs font-medium text-lime-foreground">
              Near goal
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleBookmark();
            }}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? "Remove bookmark" : "Save"}
            className={cn(
              "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors",
              bookmarked ? "bg-ink text-ink-foreground" : "bg-white/90 text-ink hover:bg-white",
            )}
          >
            <Bookmark className="h-4 w-4" fill={bookmarked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex-1">
            <h3 className="line-clamp-2 font-fraunces text-base leading-snug text-ink group-hover:underline">
              {item.title}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink/60">
              <span className="truncate">{item.orgName}</span>
              {item.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
            </div>
            {item.location && (
              <div className="mt-1 flex items-center gap-1 text-xs text-ink/50">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{item.location}</span>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-ink/70">
              <span className="font-medium text-ink">{item.percent}% funded</span>
              <span>
                {item.type === "campaign"
                  ? `₦${item.raised.toLocaleString()} raised`
                  : `${item.raised.toLocaleString()} signed`}
              </span>
            </div>
            <Progress value={item.percent} className="h-1.5 bg-ink/10" />

            <div className="flex items-center justify-end gap-1.5 pt-1">
              {item.paused ? (
                <Button size="sm" variant="outline" disabled>
                  Paused
                </Button>
              ) : item.type === "campaign" ? (
                <>
                  <Button
                    size="sm"
                    variant="ink"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPledgeClick();
                    }}
                  >
                    <HandHeart className="h-3.5 w-3.5" />
                    Pledge
                  </Button>
                  <Button
                    size="sm"
                    variant="lime"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onGiveClick();
                    }}
                  >
                    Give now
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="lime"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSignClick();
                  }}
                >
                  Sign now
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
