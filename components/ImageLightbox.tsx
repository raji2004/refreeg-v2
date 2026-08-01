"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { isProxyMediaUrl } from "@/lib/s3/media";

type LightboxImage = {
  src: string;
  alt: string;
};

export function ImageLightbox({
  images,
  currentIndex,
  onIndexChange,
  onClose,
  label,
}: {
  images: LightboxImage[];
  currentIndex: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  label: string;
}) {
  const move = useCallback(
    (direction: -1 | 1) => {
      if (currentIndex === null || images.length < 2) return;
      onIndexChange(
        (currentIndex + direction + images.length) % images.length,
      );
    },
    [currentIndex, images.length, onIndexChange],
  );

  useEffect(() => {
    if (currentIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    const previousLightboxState = document.body.getAttribute(
      "data-media-lightbox-open",
    );
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-media-lightbox-open", "true");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
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
  }, [currentIndex, move, onClose]);

  const image = currentIndex === null ? undefined : images[currentIndex];
  if (!image || currentIndex === null) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-sm sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:top-6"
        aria-label="Close enlarged image"
        autoFocus
      >
        <X className="h-6 w-6" />
      </button>

      <div className="relative h-[calc(100svh-6rem)] w-[calc(100vw-1.5rem)] sm:h-[calc(100vh-7rem)] sm:w-[calc(100vw-8rem)]">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="100vw"
          className="object-contain drop-shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
          priority
          unoptimized={isProxyMediaUrl(image.src)}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:left-6 sm:h-12 sm:w-12"
            aria-label="Show previous enlarged image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-lg backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-6 sm:h-12 sm:w-12"
            aria-label="Show next enlarged image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium text-white backdrop-blur-md sm:bottom-6">
        {currentIndex + 1} / {images.length}
      </div>
    </div>,
    document.body,
  );
}
