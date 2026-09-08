"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPagination,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { PetitionCard } from "../petition-card";

type Petition = {
  id: string;
  title: string;
  image?: string;
  percentRaised: number;
  days_active?: number;
  totalAmount: number;
  goal?: number;
  profiles?: {
    full_name?: string;
  } | null;
};

export default function FeaturedPetitionsCarousel({
  petitions,
}: {
  petitions: Petition[];
}) {

  const [api, setApi] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoplay = useCallback(() => {
    if (!api) return;

    timerRef.current = setInterval(() => {
      api.scrollNext();
    }, 6500);
  }, [api]);

  const stopAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!api) return;

    startAutoplay();
    return () => stopAutoplay();
  }, [api, startAutoplay]);
  

  return (
    <>
      {/* ✅ MOBILE: Vertical (only 3) */}
      <div className="flex flex-col gap-4 md:hidden mt-6 mb-6">
        {petitions.slice(0, 3).map((petition) => (
          <div key={petition.id}>
            <PetitionCard petition={petition} />
          </div>
        ))}

        <Link href="/petitions" className="w-full">
          <button className="w-full py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
            See More
          </button>
        </Link>
      </div>

      {/* ✅ DESKTOP: Carousel */}
      <div className="hidden md:block">
        <Carousel
          setApi={setApi}
          opts={{ loop: true }}
          className="w-full px-14"
          onMouseEnter={stopAutoplay}
          onMouseLeave={startAutoplay}
        >
          <CarouselContent className="mt-6 mb-6 md:mr-4 md:ml-4">
            {petitions.map((petition) => (
              <CarouselItem
                key={petition.id}
                className="md:pl-4 md:basis-[33.33%]"
              >
                <PetitionCard petition={petition} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="left-0 top-[42%]" />
          <CarouselNext className="right-0 top-[42%]" />

          <div className="mb-4 flex justify-center">
            <CarouselPagination />
          </div>
        </Carousel>
      </div>
    </>
  );
}
