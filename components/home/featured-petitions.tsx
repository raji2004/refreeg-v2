import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DonateButton } from "@/components/donate-button";
import { H2, P, H4 } from "../typograpy";
import { Button } from "../ui/button";
import { listPetitions } from "@/actions";
import { listSignaturesForPetition } from "@/actions/signature-actions";
import AnimatedCard from "./components/AnimatedCard";
import AnimatedHeader from "@/components/home/components/AnimatedHeader";
import { ArrowRight } from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export async function FeaturedPetitions() {
  const featuredPetitions = await listPetitions();

  if (!featuredPetitions || featuredPetitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        {/* Empty state */}
        <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold">No Petitions Found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          There are currently no petitions available. Check back later for new
          opportunities to make a difference.
        </p>
      </div>
    );
  }

  // ✅ Fetch signers for each petition
  const petitionsWithSigners = await Promise.all(
    featuredPetitions.map(async (petition) => {
      const signers = await listSignaturesForPetition(petition.id);
      const percentSigned = Math.min(
        Math.round(((signers?.length || 0) / petition.goal) * 100),
        100
      );
      return { ...petition, signers, percentSigned };
    })
  );

  return (
    <div className="space-y-10 relative py-12">
      <Carousel className="w-full">
        <div className="flex items-start justify-between w-full relative">
          <AnimatedHeader>
            <H2 className="text-black text-4xl font-bold font-['Montserrat'] leading-[48px] mb-2">
              Featured Petitions
            </H2>
            <P className="text-lg text-gray-500">
              Explore petitions raising awareness and gathering support.
            </P>
          </AnimatedHeader>
          <div className="flex items-center gap-2 ml-4">
            <CarouselPrevious className="static translate-y-0 translate-x-0" />
            <CarouselNext className="static translate-y-0 translate-x-0" />
          </div>
        </div>

        <CarouselContent className="mt-6 mb-6 ml-4 mr-4">
          {petitionsWithSigners.map((petition) => (
            <CarouselItem
              key={petition.id}
              className="basis-[85%] sm:basis-[50%] md:basis-[33.33%]"
            >
              <Link
                href={`/petitions/${petition.id}`}
                className="group block h-full"
              >
                <AnimatedCard>
                  <Card className="overflow-hidden cursor-pointer transition hover:shadow-2xl shadow-lg h-[420px] flex flex-col border border-gray-300 ">
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={petition.image || "/placeholder.svg"}
                        alt={petition.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <CardHeader className="flex flex-col flex-1 p-4 ">
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
                          {petition.percentSigned}% •{" "}
                          {Number(petition.days_active || 0)} days left
                        </P>
                      </div>
                    </CardHeader>
                    <div className="mt-auto w-full">
                      <CardContent>
                        <div className="space-y-2">
                          <Progress
                            value={petition.percentSigned}
                            className="h-2 bg-muted"
                          />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="w-full flex justify-between">
                          <span className="flex flex-col">
                            <H4>{petition.signers.length}</H4>
                            <P className="font-light">
                              Signed of {petition.goal?.toLocaleString()}
                            </P>
                          </span>
                          <span>
                            <DonateButton type="petition" disableLink />
                          </span>
                        </div>
                      </CardFooter>
                    </div>
                  </Card>
                </AnimatedCard>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* View All Button */}
      <div className="flex justify-center mt-6">
        <Link href="/petitions">
          <Button
            variant="outline"
            size="lg"
            className="hover:bg-secondary/90 flex gap-2"
          >
            View More <ArrowRight />
          </Button>
        </Link>
      </div>
    </div>
  );
}
