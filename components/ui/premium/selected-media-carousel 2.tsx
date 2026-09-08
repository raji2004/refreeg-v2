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

import { motion, AnimatePresence } from "framer-motion";

interface SelectedMediaCarouselProps {
  files: File[];
  onRemove: (index: number) => void;
  className?: string;
}

export function SelectedMediaCarousel({
  files,
  onRemove,
  className,
}: SelectedMediaCarouselProps) {
  const [previews, setPreviews] = React.useState<string[]>([]);

  React.useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Carousel View */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            <AnimatePresence mode="popLayout">
              {previews.map((url, index) => (
                <CarouselItem key={url} className="basis-full">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/20"
                  >
                    <Image
                      src={url}
                      alt={`Preview ${index}`}
                      fill
                      sizes="100vw"
                      unoptimized
                      className="object-cover"
                    />
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
                        {index + 1} <span className="opacity-60 mx-1">/</span>{" "}
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
          {previews.map((url, index) => (
            <motion.div
              key={url}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.05 }}
              className="relative group aspect-video rounded-2xl overflow-hidden shadow-lg border border-brand/5 bg-black/5"
            >
              <Image
                src={url}
                alt={`Preview ${index}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                unoptimized
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="rounded-full h-12 w-12 p-0 shadow-2xl border-2 border-white/10 hover:scale-110 active:scale-95 transition-all transform translate-y-4 group-hover:translate-y-0"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute bottom-4 right-4 glass-morphism px-3 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <span className="text-white text-[10px] font-bold tracking-[0.1em] uppercase">
                  Item 0{index + 1}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
