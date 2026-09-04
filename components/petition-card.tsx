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
import { DonateButton } from "@/components/donate-button";
import { Button } from "@/components/ui/button";
import { H4, P } from "./typography";
import AnimatedCard from "./home/components/AnimatedCard";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface PetitionCardProps {
  petition: {
    id: string;
    title: string;
    image?: string | null;
    percentRaised: number;
    days_active?: number | null;
    totalAmount: number;
    goal?: number | null;
    profiles?: {
      full_name?: string;
    } | null;
  };
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  onSignClick?: () => void;
}

export function PetitionCard({
  petition,
  bookmarked,
  onToggleBookmark,
  onSignClick,
}: PetitionCardProps) {
  return (
    <Link href={`/petitions/${petition.id}`} className="group block h-full">
      <AnimatedCard>
        <Card className="overflow-hidden cursor-pointer transition h-[420px] flex flex-col border border-gray-300">
          <div className="aspect-video w-full overflow-hidden relative">
            <Image
              src={getMediaUrl(petition.image) || "/placeholder.svg"}
              alt={petition.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              unoptimized={isProxyMediaUrl(getMediaUrl(petition.image))}
            />
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

          <CardHeader className="flex flex-col flex-1 p-4">
            <CardTitle>
              <H4 className="line-clamp-2">{petition.title}</H4>
              <P className="font-extralight text-sm text-muted-foreground">
                {petition.profiles?.full_name || "Unknown"}
              </P>
            </CardTitle>

            <hr className="border-t border-gray-200 mt-2" />

            <div className="flex justify-between items-center pt-2 text-xs">
              <P className="text-xs">Sign Now</P>
              <P className="text-xs">
                {petition.percentRaised}% • {Number(petition.days_active || 0)}{" "}
                Days left
              </P>
            </div>
          </CardHeader>

          <div className="mt-auto w-full">
            <CardContent className="pb-4">
              <Progress
                value={petition.percentRaised}
                className="h-2 bg-muted"
              />
            </CardContent>

            <CardFooter className="pt-0 border-t border-gray-100 mt-2">
              <div className="w-full flex justify-between items-center pt-4">
                <span className="flex flex-col">
                  <H4 className="text-lg">
                    {petition.totalAmount.toLocaleString()}
                  </H4>
                  <P className="font-light text-xs text-muted-foreground">
                    Signed of {petition.goal?.toLocaleString()}
                  </P>
                </span>

                {onSignClick ? (
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
                ) : (
                  <DonateButton type="petition" disableLink />
                )}
              </div>
            </CardFooter>
          </div>
        </Card>
      </AnimatedCard>
    </Link>
  );
}
