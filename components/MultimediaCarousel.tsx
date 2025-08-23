"use client";
import React, { useState } from "react";

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

  // Convert string array to MediaItem array
  const processMedia = (): MediaItem[] => {
    if (media.length === 0) return [];

    return media.map((url) => ({
      type:
        url.match(/\.(mp4|mov|webm)$/i) ||
        url.match(/(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com)/i)
          ? "video"
          : "image",
      url,
    }));
  };

  const mediaItems = processMedia();
  const slides = coverImage
    ? [{ type: "image" as const, url: coverImage }, ...mediaItems]
    : mediaItems;

  const goTo = (idx: number) => setCurrent(idx);
  const prev = () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1));

  const renderMediaItem = (item: MediaItem, idx: number) => {
    if (item.type === "video") {
      const url = item.url;

      // YouTube embed
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = url.includes("youtube.com")
          ? new URL(url).searchParams.get("v")
          : url.split("youtu.be/")[1];
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

      // TikTok embed (requires /embed/VIDEO_ID)
      else if (url.includes("tiktok.com")) {
        const match = url.match(/\/video\/(\d+)/);
        const videoId = match ? match[1] : null;
        if (videoId) {
          return (
            <iframe
              src={`https://www.tiktok.com/embed/${videoId}`}
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
        const fileIdMatch = url.match(/\/d\/([^/]+)\//);
        const fileId = fileIdMatch ? fileIdMatch[1] : null;
        if (fileId) {
          return (
            <iframe
              src={`https://drive.google.com/file/d/${fileId}/preview`}
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
        <img
          src={item.url}
          alt={`${title} - Image ${idx + 1}`}
          className="object-cover w-full h-full"
        />
      );
    }
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
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
      {/* Navigation Buttons */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full w-10 h-10 shadow-md z-20"
            aria-label="Previous"
            type="button"
          >
            &#8592;
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-black rounded-full w-10 h-10 shadow-md z-20"
            aria-label="Next"
            type="button"
          >
            &#8594;
          </button>
        </>
      )}
      {/* Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`w-2 h-2 rounded-full ${
                idx === current ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
}
