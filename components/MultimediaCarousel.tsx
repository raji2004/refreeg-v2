"use client";
import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface MediaItem {
  type: "image" | "video";
  url: string;
}

export default function MultimediaCarousel({
  media,
  coverImage,
  title,
}: {
  media: string[];
  coverImage?: string;
  title: string;
}) {
  const [current, setCurrent] = useState(0);

  // Helpers to normalize and extract IDs from popular providers
  const extractYouTubeId = (rawUrl: string): string | null => {
    try {
      const url = new URL(rawUrl);
      // youtube.com/watch?v=ID or other params
      const vParam = url.searchParams.get("v");
      if (vParam) return vParam;
      // youtu.be/ID (may include extra path or params)
      if (url.hostname.includes("youtu.be")) {
        const path = url.pathname.replace(/^\//, "");
        return path ? path.split("/")[0] : null;
      }
      // youtube.com/shorts/ID
      const shortsMatch = url.pathname.match(/\/shorts\/([^/?#]+)/);
      if (shortsMatch) return shortsMatch[1];
      // youtube.com/embed/ID already embedded
      const embedMatch = url.pathname.match(/\/embed\/([^/?#]+)/);
      if (embedMatch) return embedMatch[1];
      return null;
    } catch {
      // Fallback regex if URL constructor fails
      const direct = rawUrl.match(
        /(?:v=|be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/,
      );
      return direct ? direct[1] : null;
    }
  };

  const extractTikTokId = (rawUrl: string): string | null => {
    try {
      const url = new URL(rawUrl);
      // https://www.tiktok.com/@user/video/1234567890123456789
      const match = url.pathname.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
    } catch {
      const match = rawUrl.match(/\/video\/(\d+)/);
      return match ? match[1] : null;
    }
  };

  const buildDrivePreviewUrl = (rawUrl: string): string | null => {
    // Support: /file/d/{id}/view, /file/d/{id}/, open?id=, uc?id=
    const dMatch = rawUrl.match(/\/d\/([^/]+)\//);
    if (dMatch) return `https://drive.google.com/file/d/${dMatch[1]}/preview`;
    const idParamMatch = rawUrl.match(/[?&]id=([^&#]+)/);
    if (idParamMatch)
      return `https://drive.google.com/file/d/${idParamMatch[1]}/preview`;
    return null;
  };

  // Convert string array to MediaItem array
  const processMedia = (): MediaItem[] => {
    if (media.length === 0) return [];

    return media.map((url) => ({
      type:
        url.match(/\.(mp4|mov|webm)$/i) ||
        url.match(/(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com)/i)
          ? "video"
          : "image",
      url: getMediaUrl(url),
    }));
  };

  const mediaItems = processMedia();
  const slides = coverImage
    ? [{ type: "image" as const, url: getMediaUrl(coverImage) }, ...mediaItems]
    : mediaItems;

  const goTo = (idx: number) => setCurrent(idx);
  const prev = () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1));

  const renderMediaItem = (item: MediaItem, idx: number) => {
    if (item.type === "video") {
      const url = item.url;

      // YouTube embed
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = extractYouTubeId(url);
        return (
          <iframe
            src={videoId ? `https://www.youtube.com/embed/${videoId}` : url}
            title={`${title} - Video ${idx + 1}`}
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }

      // TikTok embed (requires /embed/VIDEO_ID)
      else if (url.includes("tiktok.com")) {
        const videoId = extractTikTokId(url);
        if (videoId) {
          return (
            <iframe
              src={`https://www.tiktok.com/embed/v2/${videoId}`}
              title={`${title} - TikTok Video ${idx + 1}`}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          );
        }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View TikTok Video
          </a>
        );
      }

      // Google Drive embed (/file/{id}/preview)
      else if (url.includes("drive.google.com")) {
        const previewUrl = buildDrivePreviewUrl(url);
        if (previewUrl) {
          return (
            <iframe
              src={previewUrl}
              title={`${title} - Drive Video ${idx + 1}`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          );
        }
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View Google Drive Video
          </a>
        );
      }

      // Direct video file
      else {
        return (
          <video
            src={url}
            controls
            className="object-contain w-full h-full bg-black"
            poster={coverImage && idx === 0 ? coverImage : undefined}
          />
        );
      }
    } else {
      // Image
      return (
        <div className="relative h-full w-full flex items-center justify-center bg-slate-950">
          <Image
            src={item.url}
            alt={`${title} - Image ${idx + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="object-contain"
            unoptimized={isProxyMediaUrl(item.url)}
          />
        </div>
      );
    }
  };

  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-black sm:aspect-[16/10] lg:aspect-[16/9]">
        {slides.map((item, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-500 ${
              idx === current ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
          >
            {renderMediaItem(item, idx)}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-black/10" />
        {/* Navigation Buttons */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-[0_12px_28px_rgba(15,23,42,0.38)] backdrop-blur-md transition-all duration-200 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-0"
              aria-label="Previous"
              type="button"
            >
              <ChevronLeft className="h-5 w-5 stroke-[2.25]" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-[0_12px_28px_rgba(15,23,42,0.38)] backdrop-blur-md transition-all duration-200 hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-0"
              aria-label="Next"
              type="button"
            >
              <ChevronRight className="h-5 w-5 stroke-[2.25]" />
            </button>
          </>
        )}
        {/* Indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === current
                    ? "w-2.5 scale-125 bg-white"
                    : "w-2.5 scale-100 bg-white/55 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
                type="button"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
