import { H2, P } from "../typography";
import AnimatedHeader from "@/components/home/components/AnimatedHeader";
import FeaturedPetitionsCarousel from "./FeaturedPetitionsCarousel";

import { getRankedPetitions } from "@/lib/petitions-ranked";

export async function FeaturedPetitions() {
  const petitionsWithSigners = await getRankedPetitions("all");

  if (!petitionsWithSigners || petitionsWithSigners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10 relative py-12">
      <div className="flex items-start justify-between w-full relative">
        <AnimatedHeader className="flex-1">
          <H2 className="text-black text-4xl font-bold font-['Montserrat'] leading-[48px] mb-2">
            Featured Petitions
          </H2>

          <P className="text-lg text-gray-500">
            Explore petitions raising awareness and gathering support.
          </P>
        </AnimatedHeader>
      </div>

      <FeaturedPetitionsCarousel petitions={petitionsWithSigners} />
    </div>
  );
}
