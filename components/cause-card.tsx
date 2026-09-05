"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DonateButton } from "@/components/donate-button";
import { Button } from "@/components/ui/button";
import { H4, P } from "./typography";
import AnimatedCard from "./home/components/AnimatedCard";
import { MapPin, Clock, Bookmark, HandHeart } from "lucide-react";
import type { Cause } from "@/types";
import { getCampaignCategoryStyle } from "@/lib/campaign-categories";
import { cn } from "@/lib/utils";

import { calculateDaysLeft, isCauseExpired } from "@/utils/cause/cause-utils";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { causePublicPath } from "@/lib/causes/slug";

interface CauseCardProps {
  cause: Cause;
  action?: string | null;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  onGiveClick?: () => void;
  onPledgeClick?: () => void;
}

export function CauseCard({
  cause,
  action,
  bookmarked,
  onToggleBookmark,
  onGiveClick,
  onPledgeClick,
}: CauseCardProps) {
  const percentFunded = cause.goal
    ? Math.min(Math.round((cause.raised / cause.goal) * 100), 100)
    : 0;

  const catConfig = getCampaignCategoryStyle(cause.category);
  const CategoryIcon = catConfig.icon;

  const daysLeft = calculateDaysLeft(cause);
  const isExpired = isCauseExpired(cause);

  return (
    <Link href={causePublicPath(cause)} className="group block h-full">
      <AnimatedCard>
        <Card className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl shadow-md h-full flex flex-col border border-gray-200/80 bg-white">
          {/* Image Section */}
          <div className="aspect-video w-full overflow-hidden relative">
            <Image
              src={getMediaUrl(cause.image) || "/placeholder.svg"}
              alt={cause.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized={isProxyMediaUrl(getMediaUrl(cause.image))}
            />
            {/* Category Badge Overlay */}
            <div className="absolute top-3 left-3">
              <Badge
                variant="secondary"
                className={`${catConfig.badgeClassName} border text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 shadow-sm`}
              >
                <CategoryIcon className="h-3 w-3" />
                <span>{catConfig.name}</span>
              </Badge>
            </div>
            {/* Days Left / Expired / Paused Overlay */}
            {cause.paused ? (
              <div className="absolute top-3 right-3">
                <Badge
                  variant="outline"
                  className="bg-gold/90 backdrop-blur-sm text-ink border-gold/50 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Paused
                </Badge>
              </div>
            ) : isExpired ? (
              <div className="absolute top-3 right-3">
                <Badge
                  variant="outline"
                  className="bg-red-500/90 backdrop-blur-sm text-white border-red-400/50 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Ended
                </Badge>
              </div>
            ) : daysLeft > 0 ? (
              <div className="absolute top-3 right-3">
                <Badge
                  variant="outline"
                  className={`backdrop-blur-sm text-xs font-medium px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 ${
                    daysLeft <= 3
                      ? "bg-amber-500/90 text-white border-amber-400/50"
                      : "bg-white/90 text-gray-700 border-white/50"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </Badge>
              </div>
            ) : null}
            {onToggleBookmark && (
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
                  "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm shadow-sm transition-colors",
                  bookmarked
                    ? "bg-ink text-ink-foreground"
                    : "bg-white/90 text-slate-700 hover:bg-white",
                )}
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={bookmarked ? "currentColor" : "none"}
                />
              </button>
            )}
          </div>

          {/* Content */}
          <CardHeader className="flex flex-col flex-1 p-4 pb-2">
            <CardTitle className="space-y-1.5">
              <H4 className="line-clamp-2 leading-snug group-hover:text-blue-900 transition-colors duration-200">
                {cause.title}
              </H4>
              <div className="flex items-center gap-2">
                {/* Creator avatar + name */}
                {cause.profiles?.profile_photo ? (
                  <Image
                    src={getMediaUrl(cause.profiles.profile_photo)}
                    alt={cause.profiles.full_name || "Creator"}
                    width={20}
                    height={20}
                    className="rounded-full object-cover ring-1 ring-gray-200"
                    unoptimized={isProxyMediaUrl(
                      getMediaUrl(cause.profiles.profile_photo),
                    )}
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-gray-200">
                    {(cause.profiles?.full_name || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <P className="font-light text-sm text-muted-foreground truncate">
                  {cause.profiles?.full_name || "Anonymous"}
                </P>
              </div>
            </CardTitle>

            {/* Summary snippet */}
            {cause.summary && (
              <P className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {cause.summary}
              </P>
            )}

            {/* Location */}
            {cause.location && (
              <div className="flex items-center gap-1 mt-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <P className="text-xs text-muted-foreground truncate">
                  {cause.location}
                </P>
              </div>
            )}
          </CardHeader>

          {/* Progress + Footer */}
          <div className="mt-auto w-full">
            <CardContent className="px-4 pb-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1.5">
                <span className="font-medium text-foreground">
                  {percentFunded}% funded
                </span>
                <span>₦{cause.raised?.toLocaleString()} raised</span>
              </div>
              <Progress value={percentFunded} className="h-2 bg-gray-100" />
            </CardContent>

            <CardFooter className="px-4 pt-2 pb-4 border-t border-gray-100">
              <div className="w-full flex justify-between items-center">
                <span className="flex flex-col">
                  <H4 className="text-lg font-semibold">
                    ₦{cause.raised?.toLocaleString()}
                  </H4>
                  <P className="font-light text-xs text-muted-foreground">
                    of ₦{cause.goal?.toLocaleString()} goal
                  </P>
                </span>
                {cause.paused ? (
                  <Button size="sm" variant="outline" disabled>
                    Paused
                  </Button>
                ) : onGiveClick || onPledgeClick ? (
                  <div className="flex items-center gap-1.5">
                    {onPledgeClick && (
                      <Button
                        size="sm"
                        variant="outline"
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
                    )}
                    {onGiveClick && (
                      <Button
                        size="sm"
                        variant="ink"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onGiveClick();
                        }}
                      >
                        Give now
                      </Button>
                    )}
                  </div>
                ) : (
                  <DonateButton type="cause" id={cause.id} disableLink />
                )}
              </div>
            </CardFooter>
          </div>
        </Card>
      </AnimatedCard>
    </Link>
  );
}
