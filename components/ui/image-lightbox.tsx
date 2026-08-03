"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { isProxyMediaUrl } from "@/lib/s3/media";

interface ImageLightboxProps {
  images: string[];
  index: number | null;
  onOpenChange: (index: number | null) => void;
}

/**
 * Full-size, navigable close-up view for a set of already-resolved image
 * URLs. Built on the existing Dialog primitive rather than a new library —
 * pass `index={null}` to keep it closed, or the index of the image to show.
 */
export function ImageLightbox({ images, index, onOpenChange }: ImageLightboxProps) {
  const open = index !== null;

  const goTo = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      onOpenChange(((next % images.length) + images.length) % images.length);
    },
    [images.length, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") goTo((index ?? 0) + 1);
      if (event.key === "ArrowLeft") goTo((index ?? 0) - 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, index, goTo]);

  if (index === null) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(null)}>
      <DialogContent className="max-w-5xl border-white/10 bg-black/95 p-0 sm:rounded-2xl [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
        <div className="relative flex h-[70vh] w-full items-center justify-center overflow-hidden rounded-2xl">
          <Image
            src={images[index]}
            alt=""
            fill
            className="object-contain"
            sizes="100vw"
            unoptimized={isProxyMediaUrl(images[index])}
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {index + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
