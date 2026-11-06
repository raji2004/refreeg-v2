"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { formatNairaShort } from "@/lib/discover-summary";
import {
  daysLabel,
  exclusionReason,
  isClosingSoon,
  isEligible,
  type SavedItem,
} from "@/lib/saved";

interface Props {
  item: SavedItem;
  selectMode: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onUnsave: (id: string) => void;
  onGive: (item: SavedItem) => void;
  onSign: (item: SavedItem) => void;
}

const CHIP =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider";

function chipFor(item: SavedItem) {
  if (item.status === "closed")
    return {
      label: "Closed · not funded",
      className: "bg-ink text-ink-foreground",
    };
  if (item.status === "paused")
    return { label: "Paused", className: "bg-gold text-gold-foreground" };
  if (item.status === "petition")
    return { label: "Petition", className: "bg-sand text-ink" };
  if (isClosingSoon(item) && item.daysLeft !== null)
    return {
      label: `Urgent · ${daysLabel(item.daysLeft)}`,
      className: "bg-rust text-white",
    };
  return null;
}

/** Normal mode reads as progress. Select mode reads as the gap. */
function caption(item: SavedItem, selectMode: boolean) {
  const days = item.daysLeft !== null ? ` · ${daysLabel(item.daysLeft)}` : "";
  return selectMode
    ? `${formatNairaShort(item.short)} short${days}`
    : `${formatNairaShort(item.raised)} of ${formatNairaShort(item.goal)}${days}`;
}

export function SavedCard({
  item,
  selectMode,
  isSelected,
  onToggle,
  onUnsave,
  onGive,
  onSign,
}: Props) {
  const eligible = isEligible(item);
  const excluded = selectMode && !eligible;
  const reason = exclusionReason(item);
  const chip = chipFor(item);
  const imageUrl = getMediaUrl(item.image) || "/placeholder.svg";
  const urgent = isClosingSoon(item);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={selectMode && eligible ? () => onToggle(item.id) : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-surface transition-shadow duration-150",
        urgent ? "border-rust/40" : "border-hairline",
        selectMode && eligible && "cursor-pointer",
        isSelected && "border-ink ring-2 ring-ink",
      )}
    >
      {/* The dim sits on an inner wrapper: framer-motion owns the article's inline opacity. */}
      <div
        className={cn(
          "transition-opacity duration-150",
          excluded && "opacity-[0.55]",
        )}
      >
        <div className="relative aspect-[2.15/1] w-full overflow-hidden bg-cream-muted">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover"
            unoptimized={isProxyMediaUrl(imageUrl)}
          />

          {chip && (
            <span className={cn(CHIP, "absolute left-3 top-3", chip.className)}>
              {chip.label}
            </span>
          )}

          {/* One slot, two occupants: the bookmark, or the checkbox in select mode. */}
          <div className="absolute right-3 top-3 z-10">
            {selectMode ? (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  disabled={!eligible}
                  onCheckedChange={() => onToggle(item.id)}
                  aria-label={
                    eligible
                      ? `Select ${item.title}`
                      : `${item.title} cannot be selected`
                  }
                  className="h-6 w-6 rounded-md border-2 border-ink/40 bg-surface data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-ink-foreground"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onUnsave(item.id)}
                aria-label="Remove from saved"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-ink-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                <Bookmark className="h-4 w-4" fill="currentColor" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <h3 className="line-clamp-2 font-fraunces text-lg leading-snug text-ink">
            {selectMode ? (
              item.title
            ) : (
              <Link href={item.href} className="hover:underline">
                {item.title}
              </Link>
            )}
          </h3>

          {item.status === "open" && (
            <>
              <Progress
                value={item.percent}
                aria-label={`${item.percent}% funded`}
                indicatorVariant="cyan"
                className="h-1.5 bg-cream-muted"
              />
              <p className="text-xs font-medium text-ink/60">
                {caption(item, selectMode)}
              </p>
            </>
          )}

          {item.status === "paused" && !selectMode && (
            <p className="text-sm text-ink/60">
              Raised {formatNairaShort(item.raised)} of{" "}
              {formatNairaShort(item.goal)} so far.
            </p>
          )}

          {item.status === "closed" && !selectMode && (
            <p className="text-sm text-ink/60">
              Reached {formatNairaShort(item.raised)} of{" "}
              {formatNairaShort(item.goal)} and closed.
            </p>
          )}

          {item.status === "petition" && !selectMode && (
            <p className="text-xs font-medium text-ink/60">
              {item.raised.toLocaleString()} of {item.goal.toLocaleString()}{" "}
              signatures
            </p>
          )}

          {excluded && reason && (
            <p className="text-xs font-medium text-ink/70">{reason}</p>
          )}

          {!selectMode && (
            <div className="pt-1">
              {item.status === "petition" ? (
                <Button
                  variant="ink"
                  className="h-10 w-full rounded-xl text-sm font-semibold"
                  onClick={() => onSign(item)}
                >
                  Sign this petition
                </Button>
              ) : item.status === "closed" ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-10 w-full rounded-xl"
                >
                  <Link href={item.href}>View campaign</Link>
                </Button>
              ) : item.status === "paused" ? (
                <Button
                  variant="outline"
                  disabled
                  className="h-10 w-full rounded-xl"
                >
                  Paused
                </Button>
              ) : (
                <Button
                  variant="ink"
                  className="h-10 w-full rounded-xl text-sm font-semibold"
                  onClick={() => onGive(item)}
                >
                  Give now
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
