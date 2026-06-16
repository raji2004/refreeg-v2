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
import { H4, P } from "./typograpy";
import AnimatedCard from "./home/components/AnimatedCard";
import {
  MapPin,
  Clock,
  GraduationCap,
  HeartPulse,
  Leaf,
  Users,
  AlertTriangle,
  PawPrint,
  Sparkles,
  Briefcase,
  FolderHeart,
} from "lucide-react";
import type { Cause } from "@/types";

const categoryConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  education: {
    icon: GraduationCap,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  health: {
    icon: HeartPulse,
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
  },
  environment: {
    icon: Leaf,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  community: {
    icon: Users,
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
  },
  disaster: {
    icon: AlertTriangle,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  animals: {
    icon: PawPrint,
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
  },
  creative: {
    icon: Sparkles,
    color: "text-pink-700",
    bg: "bg-pink-50 border-pink-200",
  },
  business: {
    icon: Briefcase,
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
  },
};

const defaultCategoryConfig = {
  icon: FolderHeart,
  color: "text-gray-700",
  bg: "bg-gray-50 border-gray-200",
};

import { calculateDaysLeft, isCauseExpired } from "@/utils/cause/cause-utils";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface CauseCardProps {
  cause: Cause;
  action?: string | null;
}

export function CauseCard({ cause, action }: CauseCardProps) {
  const percentFunded = cause.goal
    ? Math.min(Math.round((cause.raised / cause.goal) * 100), 100)
    : 0;

  const catKey = cause.category?.toLowerCase() || "";
  const catConfig = categoryConfig[catKey] || defaultCategoryConfig;
  const CategoryIcon = catConfig.icon;

  const daysLeft = calculateDaysLeft(cause);
  const isExpired = isCauseExpired(cause);

  return (
    <Link href={`/causes/${cause.id}`} className="group block h-full">
      <AnimatedCard>
        <Card className="overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl shadow-md h-full flex flex-col border border-gray-200/80 bg-white">
          {/* Image Section */}
          <div className="aspect-[16/10] w-full overflow-hidden relative">
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
                className={`${catConfig.bg} ${catConfig.color} border text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5 shadow-sm`}
              >
                <CategoryIcon className="h-3 w-3" />
                <span className="capitalize">{cause.category}</span>
              </Badge>
            </div>
            {/* Days Left / Expired Overlay */}
            {isExpired ? (
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
                <DonateButton type="cause" id={cause.id} disableLink />
              </div>
            </CardFooter>
          </div>
        </Card>
      </AnimatedCard>
    </Link>
  );
}
