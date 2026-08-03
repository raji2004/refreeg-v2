"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/lib/s3/media";
import { isVideoFile } from "@/lib/media/video";

import { motion, AnimatePresence } from "framer-motion";

interface SelectedMediaCarouselProps {
  files: (File | string)[];
  onRemove: (index: number) => void;
  className?: string;
  variant?: "premium" | "refreeg";
}

function resolvePreviewUrl(file: File | string): string {
  if (typeof file === "string") {
    return getMediaUrl(file);
  }
  return URL.createObjectURL(file);
}

export function SelectedMediaCarousel({
  files,
  onRemove,
  className,
  variant = "premium",
}: SelectedMediaCarouselProps) {
  const [previews, setPreviews] = React.useState<
    { url: string; isVideo: boolean }[]
  >([]);

  React.useEffect(() => {
    const next = files.map((file) => ({
      url: resolvePreviewUrl(file),
      isVideo: isVideoFile(file),
    }));
    setPreviews(next);
    return () => {
      next.forEach((item, index) => {
        if (typeof files[index] !== "string") {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, [files]);

  if (files.length === 0) return null;

  if (variant === "refreeg") {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-3 sm:grid-cols-3",
          className,
        )}
      >
        {previews.map((item, index) => (
          <div
            key={`${item.url}-${index}`}
            className="relative aspect-video overflow-hidden rounded-xl border border-[#DDE3EA] bg-[#F1F5F9]"
          >
            {item.isVideo ? (
              <video
                src={item.url}
                controls
                playsInline
                className="h-full w-full bg-black object-contain"
              />
            ) : (
              <Image
                src={item.url}
                alt={`Preview ${index + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onRemove(index)}
              className="absolute right-2 top-2 h-8 w-8 rounded-full border border-white/60 p-0 shadow-sm"
              aria-label={`Remove ${item.isVideo ? "video" : "image"} ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="absolute bottom-2 left-2 rounded-full bg-[#10233F]/85 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
              {item.isVideo ? "Video" : "Image"} {index + 1}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Carousel View */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            <AnimatePresence mode="popLayout">
              {previews.map((item, index) => (
                <CarouselItem key={`${item.url}-${index}`} className="basis-full">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/20"
                  >
                    {item.isVideo ? (
                      <video
                        src={item.url}
                        controls
                        playsInline
                        className="object-contain w-full h-full bg-black"
                      />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Preview ${index + 1}`}
                        fill
                        sizes="100vw"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onRemove(index)}
                      className="absolute top-4 right-4 rounded-full h-11 w-11 p-0 shadow-2xl border-2 border-white/20 glass-morphism hover:bg-red-500/80 hover:scale-110 active:scale-95 transition-all z-10"
                    >
                      <X className="h-5 w-5" />
                    </Button>

                    <div className="absolute bottom-4 left-4 glass-morphism px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                      <span className="text-white text-sm font-semibold tracking-tight">
                        {item.isVideo ? "Video" : "Image"}{" "}
                        {index + 1}{" "}
                        <span className="opacity-60 mx-1">/</span>{" "}
                        {files.length}
                      </span>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </AnimatePresence>
          </CarouselContent>
          <div className="flex items-center justify-center gap-6 mt-6">
            <CarouselPrevious className="static translate-y-0 h-12 w-12 bg-white/5 border-white/10 hover:bg-white/10 text-white" />
            <CarouselNext className="static translate-y-0 h-12 w-12 bg-white/5 border-white/10 hover:bg-white/10 text-white" />
          </div>
        </Carousel>
      </div>

      {/* Desktop Grid View */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {previews.map((item, index) => (
            <motion.div
              key={`${item.url}-${index}`}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.05 }}
              className="relative group aspect-video rounded-2xl overflow-hidden shadow-lg border border-brand/5 bg-black/5"
            >
              {item.isVideo ? (
                <video
                  src={item.url}
                  controls
                  playsInline
                  className="object-contain w-full h-full bg-black"
                />
              ) : (
                <Image
                  src={item.url}
                  alt={`Preview ${index + 1}`}
                  fill
                  sizes="33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px] pointer-events-none group-hover:pointer-events-auto">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="rounded-full h-12 w-12 p-0 shadow-2xl border-2 border-white/10 hover:scale-110 active:scale-95 transition-all transform translate-y-4 group-hover:translate-y-0 pointer-events-auto"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute bottom-4 right-4 glass-morphism px-3 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <span className="text-white text-[10px] font-bold tracking-[0.1em] uppercase">
                  {item.isVideo ? "Video" : "Item"} 0{index + 1}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
