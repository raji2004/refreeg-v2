"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

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

export default function FeaturedPetitionsCarousel({
  petitions,
}: {
  petitions: any[];
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (!api) return;

    startAutoplay();

    return () => stopAutoplay();
  }, [api, startAutoplay]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      className="w-full"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
    >
      <CarouselContent className="mt-6 mb-6 md:mr-4 md:ml-4">
        {petitions.map((petition: any) => (
          <CarouselItem
            key={petition.id}
            className="md:pl-4 basis-[85%] sm:basis-[50%] md:basis-[33.33%]"
          >
            <Link
              href={`/petitions/${petition.id}`}
              className="group block h-full"
            >
              <AnimatedCard>
                <Card className="overflow-hidden cursor-pointer transition h-[420px] flex flex-col border border-gray-300">
                  <div className="relative aspect-video w-full overflow-hidden">
                    <Image
                      src={getMediaUrl(petition.image) || "/placeholder.svg"}
                      alt={petition.title}
                      fill
                      sizes="(max-width: 768px) 85vw, 33vw"
                      unoptimized={isProxyMediaUrl(
                        getMediaUrl(petition.image)
                      )}
                      className="object-cover"
                    />
                  </div>

                  <CardHeader className="flex flex-col flex-1 p-4">
                    <CardTitle>
                      <H4 className="line-clamp-2">{petition.title}</H4>

                      <P className="font-extralight">
                        {petition.profiles?.full_name || "Unknown"}
                      </P>
                    </CardTitle>

                    <hr className="border-t-2 border-gray-400" />

                    <div className="flex justify-between items-center pt-2 text-xs">
                      <P>Sign Now</P>

                      <P>
                        {petition.percentRaised}% •{" "}
                        {Number(petition.days_active || 0)} Days left
                      </P>
                    </div>
                  </CardHeader>

                  <div className="mt-auto w-full">
                    <CardContent>
                      <Progress
                        value={petition.percentRaised}
                        className="h-2 bg-muted"
                      />
                    </CardContent>

                    <CardFooter>
                      <div className="w-full flex justify-between">
                        <span className="flex flex-col">
                          <H4>{petition.totalAmount.toLocaleString()}</H4>

                          <P className="font-light">
                            Signed of {petition.goal?.toLocaleString()}
                          </P>
                        </span>

                        <DonateButton type="petition" disableLink />
                      </div>
                    </CardFooter>
                  </div>
                </Card>
              </AnimatedCard>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      <div className="flex items-center justify-end gap-2 mb-4">
        <CarouselPrevious className="static translate-x-0 translate-y-0" />
        <CarouselNext className="static translate-x-0 translate-y-0" />
      </div>
    </Carousel>
  );
}
