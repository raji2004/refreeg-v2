"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";
import { DonateButton } from "@/components/donate-button";
import { H4, P } from "../typograpy";
import AnimatedCard from "./components/AnimatedCard";
import Image from "next/image";

type Cause = {
  id: string;
  title: string;
  image?: string;
  goal: number;
  raised: number;
  days_active?: number;
  profiles?: {
    full_name?: string;
  };
};

export default function UrgentCausesCarousel({ causes }: { causes: Cause[] }) {
  const [api, setApi] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoplay = () => {
    if (!api) return;

    timerRef.current = setInterval(() => {
      api.scrollNext();
    }, 6500);
  };

  const stopAutoplay = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (!api) return;

    startAutoplay();
    return () => stopAutoplay();
  }, [api]);

  const renderCard = (cause: any) => {
    const percentRaised =
      cause.goal > 0
        ? Math.round((cause.raised / cause.goal) * 100)
        : 0;

    return (
      <Link href={`/causes/${cause.id}`} className="group block h-full">
        <AnimatedCard>
          <Card className="overflow-hidden cursor-pointer transition h-full flex flex-col border border-gray-300">
            
            <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
              <Image
                src={cause.image || "/placeholder.svg"}
                alt={cause.title}
                fill
                className="object-cover"
              />
            </div>

            <CardHeader className="flex flex-col flex-1 p-4">
              <CardTitle>
                <H4>{cause.title}</H4>
                <P className="font-extralight">
                  {cause.profiles?.full_name || "Unknown"}
                </P>
              </CardTitle>

              <hr className="border-t-2 border-gray-400" />

              <div className="flex justify-between items-center pt-2 text-xs">
                <P>Raised</P>
                <P>
                  {percentRaised}% • {cause.days_active} Days left
                </P>
              </div>
            </CardHeader>

            <div className="mt-auto w-full">
              <CardContent>
                <Progress value={percentRaised} className="h-2 bg-muted" />
              </CardContent>

              <CardFooter>
                <div className="w-full flex justify-between">
                  <span className="flex flex-col">
                    <H4>₦{cause.raised?.toLocaleString()}</H4>
                    <P className="font-light">
                      Funded of ₦{cause.goal?.toLocaleString()}
                    </P>
                  </span>

                  <DonateButton type="cause" disableLink />
                </div>
              </CardFooter>
            </div>

          </Card>
        </AnimatedCard>
      </Link>
    );
  };

  return (
    <>
      {/* ✅ MOBILE: Vertical list (only 3) */}
      <div className="flex flex-col gap-4 md:hidden mt-6 mb-6">
        {causes.slice(0, 3).map((cause) => (
          <div key={cause.id}>{renderCard(cause)}</div>
        ))}

        {/* See More Button */}
        <Link href="/causes" className="w-full">
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
          className="w-full"
          onMouseEnter={stopAutoplay}
          onMouseLeave={startAutoplay}
        >
          <CarouselContent className="mt-6 mb-6 md:mr-4 md:ml-4">
            {causes.map((cause) => (
              <CarouselItem
                key={cause.id}
                className="md:pl-4 md:basis-[33.33%]"
              >
                {renderCard(cause)}
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="flex items-center justify-end gap-2 mb-4">
            <CarouselPrevious className="static" />
            <CarouselNext className="static" />
          </div>
        </Carousel>
      </div>
    </>
  );
}