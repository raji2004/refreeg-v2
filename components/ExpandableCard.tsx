"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

// TYPES
interface ExpandableCardItem {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  goal: number;
  raised?: number;
  signatures?: number;
  category: string;
  sections?: { heading?: string; description?: string }[];
  action?: string | null;
}

interface ExpandableCardProps {
  items: ExpandableCardItem[];
  type: "cause" | "petition";
}

export function ExpandableCard({ items, type }: ExpandableCardProps) {
  const [active, setActive] = useState<ExpandableCardItem | null>(null);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // CTA TEXT
  const getCTA = (item: ExpandableCardItem) => {
    if (type === "petition") return "Sign Now";
    if (item.action === "pledge") return "Make a Pledge";
    if (item.action === "donate") return "Donate Now";
    return "Donate Now";
  };

  // NAVIGATION LOGIC
  const handleNavigation = (item: ExpandableCardItem) => {
    if (item.action === "pledge") {
      router.push(`/causes/${item.id}/pledge`);
    } else if (item.action === "donate") {
      router.push(`/causes/${item.id}`);
    } else if (type === "petition") {
      router.push(`/petitions/${item.id}/sign`);
    } else {
      router.push(`/causes/${item.id}`);
    }
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }

    if (active) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-10"
          />
        )}
      </AnimatePresence>

      {/* Expanded Card */}
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 grid place-items-center z-[100]">
            <motion.button
              className="absolute top-2 right-2 bg-white rounded-full h-6 w-6 shadow-md"
              onClick={() => setActive(null)}
            >
              <CloseIcon />
            </motion.button>

            <motion.div
              layoutId={`card-${active.id}-${id}`}
              ref={ref}
              className="w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-white sm:rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="relative w-full h-80">
                <Image
                  src={getMediaUrl(active.image) || "/placeholder-cause.jpg"}
                  alt={active.title}
                  fill
                  sizes="500px"
                  className="object-cover"
                  unoptimized={isProxyMediaUrl(getMediaUrl(active.image))}
                />
              </div>

              <div className="relative flex-1 overflow-y-auto p-4 space-y-4">
                <h3 className="font-bold">{active.title}</h3>

                {active.description && (
                  <p className="text-neutral-600 whitespace-pre-line">
                    {active.description}
                  </p>
                )}

                {active.sections?.map((section, idx) => (
                  <div key={idx}>
                    {section.heading && (
                      <h4 className="font-semibold">{section.heading}</h4>
                    )}
                    {section.description && (
                      <p className="text-neutral-600">{section.description}</p>
                    )}
                  </div>
                ))}

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {type === "cause"
                        ? `₦${(active.raised ?? 0).toLocaleString()}`
                        : `${active.signatures ?? 0} signatures`}
                    </span>
                    <span className="text-muted-foreground">
                      {type === "cause"
                        ? `of ₦${active.goal.toLocaleString()}`
                        : `of ${active.goal}`}
                    </span>
                  </div>

                  <Progress
                    value={
                      type === "cause"
                        ? ((active.raised ?? 0) / active.goal) * 100
                        : ((active.signatures ?? 0) / active.goal) * 100
                    }
                  />
                </div>

                {/* CTA */}
                <div className="sticky bottom-0 bg-white pt-4">
                  <Button
                    onClick={() => handleNavigation(active)}
                    className="w-full"
                  >
                    {getCTA(active)}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cards */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layoutId={`card-${item.id}-${id}`}
            onClick={() => handleNavigation(item)}
            className="cursor-pointer rounded-xl shadow-md bg-white flex flex-col hover:shadow-lg"
          >
            {/* Mobile */}
            <div className="flex sm:hidden p-4 gap-4">
              <Image
                src={getMediaUrl(item.image) || "/placeholder-cause.jpg"}
                alt={item.title || ""}
                width={80}
                height={80}
                className="rounded-lg object-cover"
                unoptimized={isProxyMediaUrl(getMediaUrl(item.image))}
              />

              <div className="flex-1 flex flex-col gap-2">
                <h3 className="line-clamp-1">{item.title}</h3>

                <Progress
                  value={
                    type === "cause"
                      ? ((item.raised ?? 0) / item.goal) * 100
                      : ((item.signatures ?? 0) / item.goal) * 100
                  }
                />

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation(item);
                  }}
                  className="h-8 text-xs"
                >
                  {getCTA(item)}
                </Button>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden sm:flex flex-col p-4 gap-4">
              <div className="relative h-48 w-full">
                <Image
                  src={getMediaUrl(item.image) || "/placeholder-cause.jpg"}
                  alt={item.title || ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="rounded-lg object-cover"
                  unoptimized={isProxyMediaUrl(getMediaUrl(item.image))}
                />
              </div>

              <h3 className="text-center">{item.title}</h3>

              <Progress
                value={
                  type === "cause"
                    ? ((item.raised ?? 0) / item.goal) * 100
                    : ((item.signatures ?? 0) / item.goal) * 100
                }
              />

              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNavigation(item);
                }}
              >
                {getCTA(item)}
              </Button>
            </div>
          </motion.div>
        ))}
      </ul>
    </>
  );
}

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6 6l12 12M6 18L18 6" />
  </svg>
);
