"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, Play } from "lucide-react";
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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

  const slides = useMemo(() => {
    const urls = [coverImage, ...media].filter(
      (url): url is string => Boolean(url?.trim()),
    );

    // The cause screen used to pass the cover as both `coverImage` and the
    // media fallback. De-duplicate here so every consumer gets sane controls.
    return Array.from(new Set(urls)).map<MediaItem>((url) => ({
      type:
        url.match(/\.(mp4|mov|webm)(?:[?#].*)?$/i) ||
        url.includes("/videos/") ||
        url.match(/(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com)/i)
          ? "video"
          : "image",
      url: getMediaUrl(url),
    }));
  }, [coverImage, media]);

  useEffect(() => {
    setCurrent((selected) => Math.min(selected, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  const goTo = (idx: number) => setCurrent(idx);
  const previous = () =>
    setCurrent((selected) =>
      selected === 0 ? slides.length - 1 : selected - 1,
    );
  const next = () =>
    setCurrent((selected) =>
      selected === slides.length - 1 ? 0 : selected + 1,
    );

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;

    if (!start || slides.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0) next();
    else previous();
  };

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
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-950">
          <Image
            src={item.url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="pointer-events-none scale-110 object-cover opacity-45 blur-3xl saturate-110"
            aria-hidden="true"
            unoptimized={isProxyMediaUrl(item.url)}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-950/35"
            aria-hidden="true"
          />
          <Image
            src={item.url}
            alt={`${title} - Image ${idx + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="z-10 object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            unoptimized={isProxyMediaUrl(item.url)}
          />
        </div>
      );
    }
  };

  const currentSlide = slides[current];

  if (!currentSlide) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-slate-50 text-slate-400">
        <div className="text-center">
          <ImageIcon className="mx-auto h-6 w-6" />
          <p className="mt-2 text-sm">No campaign media yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-3">
      <div
        className="relative mx-auto aspect-video w-full touch-pan-y overflow-hidden rounded-[18px] bg-slate-950"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
        {slides.length > 1 && (
          <>
            <button
              onClick={previous}
              className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-lg backdrop-blur-md transition hover:bg-slate-950/65 sm:flex"
              aria-label="Show previous media"
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-lg backdrop-blur-md transition hover:bg-slate-950/65 sm:flex"
              aria-label="Show next media"
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute right-3 top-3 z-20 hidden rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md sm:block">
              {current + 1} / {slides.length}
            </div>
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-slate-950/35 px-2.5 py-2 backdrop-blur-sm sm:hidden">
              {slides.map((item, idx) => (
                <button
                  key={`indicator-${item.url}-${idx}`}
                  onClick={() => goTo(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === current ? "w-5 bg-white" : "w-2 bg-white/60"
                  }`}
                  aria-label={`Show media ${idx + 1}`}
                  aria-current={idx === current}
                  type="button"
                />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">
              Showing media {current + 1} of {slides.length}. Swipe left or
              right to browse.
            </span>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div
          className="mt-3 hidden gap-2 overflow-x-auto px-1 pb-1 sm:flex"
          aria-label="Campaign media"
        >
          {slides.map((item, idx) => (
            <button
              key={`${item.url}-${idx}`}
              onClick={() => goTo(idx)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 transition sm:h-20 sm:w-20 ${
                idx === current
                  ? "border-blue-600 ring-2 ring-blue-100"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Show ${item.type} ${idx + 1} of ${slides.length}`}
              aria-current={idx === current}
              type="button"
            >
              {item.type === "image" ? (
                <Image
                  src={item.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={isProxyMediaUrl(item.url)}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-slate-900 text-white">
                  <Play className="h-5 w-5 fill-current" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
