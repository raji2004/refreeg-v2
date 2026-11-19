"use client";

import { useRef } from "react";
import Image from "next/image";

import { useGsap } from "@/hooks/use-gsap";
import { cn } from "@/lib/utils";

import type { UseCase } from "../_data/use-cases";

export function UseCaseBand({
  useCase,
  index,
}: {
  useCase: UseCase;
  index: number;
}) {
  const bandRef = useRef<HTMLDivElement>(null);

  useGsap((gsap) => {
    gsap.to(".cf-band-image", {
      scrollTrigger: {
        trigger: bandRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
      yPercent: 12,
      ease: "none",
    });
  }, bandRef);

  return (
    <div
      ref={bandRef}
      className={cn(
        "relative mx-4 flex min-h-[460px] items-end overflow-hidden rounded-lg shadow-lg sm:mx-8 md:h-[78vh]",
        !useCase.image && "bg-brand-blue",
      )}
    >
      {useCase.image && (
        <>
          <Image
            src={useCase.image.src}
            alt={useCase.image.alt}
            fill
            sizes="100vw"
            className="cf-band-image scale-110 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
        </>
      )}

      <div className="relative w-full px-6 pb-10 sm:px-10 md:px-14 md:pb-16">
        <p className="flex items-baseline gap-3 text-sm font-medium text-white/80">
          <span className="font-fraunces italic">
            {String(index + 1).padStart(2, "0")}
          </span>
          For {useCase.label.toLowerCase()}
        </p>
        <h2
          id={`${useCase.id}-heading`}
          className="mt-4 max-w-4xl font-fraunces text-5xl font-normal leading-[1.02] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          {useCase.heading} <em className="text-lime">{useCase.emphasis}</em>
        </h2>
      </div>
    </div>
  );
}
