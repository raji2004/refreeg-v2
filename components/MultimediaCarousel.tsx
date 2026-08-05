"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, Maximize2, Play, X } from "lucide-react";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { Button } from "@/components/ui/button";

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);

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
      // youtube.com/v/ID (legacy)
      const legacyMatch = url.pathname.match(/\/v\/([^/?#]+)/);
      if (legacyMatch) return legacyMatch[1];
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

  const imageIndexes = useMemo(
    () =>
      slides.reduce<number[]>((indexes, slide, index) => {
        if (slide.type === "image") indexes.push(index);
        return indexes;
      }, []),
    [slides],
  );

  const moveLightbox = useCallback(
    (direction: -1 | 1) => {
      if (lightboxIndex === null || imageIndexes.length < 2) return;

      const position = imageIndexes.indexOf(lightboxIndex);
      const nextPosition =
        (position + direction + imageIndexes.length) % imageIndexes.length;
      const nextIndex = imageIndexes[nextPosition];
      setCurrent(nextIndex);
      setLightboxIndex(nextIndex);
    },
    [imageIndexes, lightboxIndex],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    const previousLightboxState = document.body.getAttribute(
      "data-media-lightbox-open",
    );
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-media-lightbox-open", "true");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousLightboxState === null) {
        document.body.removeAttribute("data-media-lightbox-open");
      } else {
        document.body.setAttribute(
          "data-media-lightbox-open",
          previousLightboxState,
        );
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, moveLightbox]);

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
    didSwipe.current = false;
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

    didSwipe.current = true;
    if (deltaX < 0) next();
    else previous();
  };

  // Shown when a video can't be embedded directly (no extractable ID, or the
  // provider refuses to be framed) — a styled card instead of a bare text
  // link, consistent with the rest of the carousel's visual language.
  const renderExternalVideoFallback = (url: string, platform: string) => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
        <Play className="h-6 w-6 fill-white text-white" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">Video preview unavailable</p>
        <p className="text-xs text-white/60">
          This {platform} video can&apos;t be embedded directly
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-white/20 text-white hover:bg-white/10 hover:text-white"
      >
        <a href={url} target="_blank" rel="noopener noreferrer">
          Watch on {platform}
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </a>
      </Button>
    </div>
  );

  const renderMediaItem = (item: MediaItem, idx: number) => {
    if (item.type === "video") {
      const url = item.url;

      // YouTube embed
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = extractYouTubeId(url);
        if (videoId) {
          return (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={`${title} - Video ${idx + 1}`}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          );
        }
        // No embeddable video ID could be extracted — YouTube's normal
        // watch-page URLs refuse to load in an iframe (X-Frame-Options), so
        // falling back to the raw url here would always render a broken
        // frame. Link out instead, matching the TikTok/Drive fallback below.
        return renderExternalVideoFallback(url, "YouTube");
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
        return renderExternalVideoFallback(url, "TikTok");
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
        return renderExternalVideoFallback(url, "Google Drive");
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
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#F4F7FC]">
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#F8FAFC_0%,#E8F1FF_45%,#F3F8FF_70%,#F8FAFC_100%)]"
            data-media-backdrop="decorative"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.035)_1px,transparent_1px)] opacity-30 [background-size:34px_34px]"
            aria-hidden="true"
          />
          <Image
            src="/logo.svg"
            alt=""
            width={202}
            height={62}
            className="pointer-events-none absolute bottom-[7%] left-[7%] hidden w-24 opacity-[0.055] mix-blend-multiply sm:block"
            aria-hidden="true"
          />
          <Image
            src="/logo.svg"
            alt=""
            width={202}
            height={62}
            className="pointer-events-none absolute bottom-[7%] right-[7%] hidden w-24 opacity-[0.055] mix-blend-multiply sm:block"
            aria-hidden="true"
          />
          <Image
            src={item.url}
            alt={`${title} - Image ${idx + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 80vw"
            className="z-10 object-contain"
            unoptimized={isProxyMediaUrl(item.url)}
          />
          <button
            type="button"
            className="absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/60 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-slate-950/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={() => setLightboxIndex(idx)}
            aria-label={`Enlarge image ${idx + 1} of ${slides.length}`}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }
  };

  const currentSlide = slides[current];
  const lightboxSlide =
    lightboxIndex === null ? undefined : slides[lightboxIndex];
  const lightboxPosition =
    lightboxIndex === null ? -1 : imageIndexes.indexOf(lightboxIndex);

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
    <>
      <div className="rounded-[22px] border border-slate-200/80 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-3">
      <div
        className="relative mx-auto h-[60svh] w-full touch-pan-y overflow-hidden rounded-[14px] bg-slate-100 sm:h-[80vh] sm:rounded-[18px]"
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

      {lightboxSlide?.type === "image" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-sm sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`Enlarged image from ${title}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLightboxIndex(null);
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
              aria-label="Close enlarged image"
              autoFocus
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative h-[calc(100svh-6rem)] w-[calc(100vw-1.5rem)] sm:h-[calc(100vh-7rem)] sm:w-[calc(100vw-8rem)]">
              <Image
                src={lightboxSlide.url}
                alt={`${title} - Enlarged image ${lightboxPosition + 1}`}
                fill
                sizes="100vw"
                className="object-contain drop-shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
                priority
                unoptimized={isProxyMediaUrl(lightboxSlide.url)}
              />
            </div>

            {imageIndexes.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveLightbox(-1)}
                  className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6 sm:h-12 sm:w-12"
                  aria-label="Show previous enlarged image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => moveLightbox(1)}
                  className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:h-12 sm:w-12"
                  aria-label="Show next enlarged image"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-md sm:bottom-6">
              {lightboxPosition + 1} / {imageIndexes.length}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
