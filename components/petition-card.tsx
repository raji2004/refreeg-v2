"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DonateButton } from "@/components/donate-button";
import { H4, P } from "./typograpy";
import AnimatedCard from "./home/components/AnimatedCard";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

interface PetitionCardProps {
  petition: {
    id: string;
    title: string;
    image?: string | null;
    percentRaised: number;
    days_active?: number | null;
    totalAmount: number;
    goal?: number | null;
    profiles?: {
      full_name?: string;
    } | null;
  };
}

export function PetitionCard({ petition }: PetitionCardProps) {
  return (
    <Link href={`/petitions/${petition.id}`} className="group block h-full">
      <AnimatedCard>
        <Card className="overflow-hidden cursor-pointer transition h-[420px] flex flex-col border border-gray-300">
          <div className="aspect-video w-full overflow-hidden relative">
            <Image
              src={getMediaUrl(petition.image) || "/placeholder.svg"}
              alt={petition.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              unoptimized={isProxyMediaUrl(getMediaUrl(petition.image))}
            />
          </div>

          <CardHeader className="flex flex-col flex-1 p-4">
            <CardTitle>
              <H4 className="line-clamp-2">{petition.title}</H4>
              <P className="font-extralight text-sm text-muted-foreground">
                {petition.profiles?.full_name || "Unknown"}
              </P>
            </CardTitle>

            <hr className="border-t border-gray-200 mt-2" />

            <div className="flex justify-between items-center pt-2 text-xs">
              <P className="text-xs">Sign Now</P>
              <P className="text-xs">
                {petition.percentRaised}% • {Number(petition.days_active || 0)}{" "}
                Days left
              </P>
            </div>
          </CardHeader>

          <div className="mt-auto w-full">
            <CardContent className="pb-4">
              <Progress
                value={petition.percentRaised}
                className="h-2 bg-muted"
              />
            </CardContent>

            <CardFooter className="pt-0 border-t border-gray-100 mt-2">
              <div className="w-full flex justify-between items-center pt-4">
                <span className="flex flex-col">
                  <H4 className="text-lg">
                    {petition.totalAmount.toLocaleString()}
                  </H4>
                  <P className="font-light text-xs text-muted-foreground">
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
  );
}
