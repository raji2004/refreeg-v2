"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getMediaUrl } from "@/lib/s3/media";

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

export default function UrgentCausesCarousel({ causes }: { causes: any[] }) {
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

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true }}
      className="w-full"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
    >
      <CarouselContent className="mt-6 mb-6 md:mr-4 md:ml-4">
        {causes.map((cause: any) => {
          const percentRaised =
            cause.goal > 0 ? Math.round((cause.raised / cause.goal) * 100) : 0;

          return (
            <CarouselItem
              key={cause.id}
              className="md:pl-4 basis-[85%] sm:basis-[50%] md:basis-[33.33%]"
            >
              <Link href={`/causes/${cause.id}`} className="group block h-full">
                <AnimatedCard>
                  <Card className="overflow-hidden cursor-pointer transition h-full flex flex-col border border-gray-300">
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={getMediaUrl(cause.image) || "/placeholder.svg"}
                        alt={cause.title}
                        loading="lazy"
                        className="object-cover w-full h-full"
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
                        <Progress
                          value={percentRaised}
                          className="h-2 bg-muted"
                        />
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
            </CarouselItem>
          );
        })}
      </CarouselContent>

      <div className="flex items-center justify-end gap-2 mb-4">
        <CarouselPrevious className="static translate-y-0 translate-x-0" />
        <CarouselNext className="static translate-y-0 translate-x-0" />
      </div>
    </Carousel>
  );
}
