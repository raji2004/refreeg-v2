"use client";

import { useState } from "react";
import Image from "next/image";
import { getMediaUrl } from "@/lib/s3/media";
import { FileText, X, ChevronLeft, ChevronRight } from "lucide-react";

type MediaEntry = {
  type: "image" | "video" | "document";
  url: string; // Matches the server action's output
  name: string;
};

export function ProofMediaGallery({ media }: { media: MediaEntry[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");
  const docs = media.filter((m) => m.type === "document");

  const open = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <>
      {(images.length > 0 || videos.length > 0 || docs.length > 0) && (
        <div className="mt-3 space-y-3">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="relative aspect-square overflow-hidden rounded-lg border border-slate-200"
                >
                  <Image
                    src={getMediaUrl(img.url) ?? ""}
                    alt={img.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 25vw"
                    className="object-cover transition hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
          {videos.map((v) => (
            <video
              key={v.url}
              src={getMediaUrl(v.url) ?? undefined}
              controls
              preload="metadata"
              className="w-full max-h-96 rounded-lg border border-slate-200 bg-black"
            />
          ))}
          {docs.map((d) => (
            <a
              key={d.url}
              href={getMediaUrl(d.url) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-slate-400" /> {d.name}
            </a>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-label="Proof media viewer"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 text-white/80 hover:text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                className="absolute left-4 text-white/80 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex! - 1 + images.length) % images.length,
                  );
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                className="absolute right-4 text-white/80 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex! + 1) % images.length);
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getMediaUrl(open.url) ?? ""}
            alt={open.name}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
