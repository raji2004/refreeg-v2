// "use client";

// import { useEffect, useRef, useState } from "react";
// import Link from "next/link";

// import {
//   Carousel,
//   CarouselContent,
//   CarouselItem,
// } from "@/components/ui/carousel";

// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";

// import { Progress } from "@/components/ui/progress";
// import { DonateButton } from "@/components/donate-button";
// import { H4, P } from "../typograpy";
// import AnimatedCard from "./components/AnimatedCard";

// type Petition = {
//   id: string;
//   title: string;
//   image?: string;
//   percentRaised: number;
//   days_active?: number;
//   totalAmount: number;
//   goal?: number;
//   profiles?: {
//     full_name?: string;
//   };
// };

// export default function FeaturedPetitionsCarousel({
//   petitions,
// }: {
//   petitions: Petition[];
// }) {
//   const [api1, setApi1] = useState<any>(null);
//   const [api2, setApi2] = useState<any>(null);

//   const timerRef = useRef<NodeJS.Timeout | null>(null);

//   /** ✅ SORT */
//   const sortedPetitions = [...petitions].sort((a, b) => {
//     const percentA = a.percentRaised || 0;
//     const percentB = b.percentRaised || 0;

//     // Push 0% to bottom
//     if (percentA === 0 && percentB > 0) return 1;
//     if (percentB === 0 && percentA > 0) return -1;

//     // Sort by percentage
//     if (percentA !== percentB) return percentB - percentA;

//     // Then by urgency
//     const daysA = a.days_active ?? Infinity;
//     const daysB = b.days_active ?? Infinity;

//     return daysA - daysB;
//   });

//   /** ✅ DECIDE LAYOUT */
//   const shouldSplit = sortedPetitions.length >= 6;

//   /** ✅ SPLIT */
//   const midpoint = Math.ceil(sortedPetitions.length / 2);
//   const firstRow = sortedPetitions.slice(0, midpoint);
//   const secondRow = sortedPetitions.slice(midpoint);

//   /** ✅ AUTOPLAY */
//   const startAutoplay = () => {
//     if (!api1 && !api2) return;

//     timerRef.current = setInterval(() => {
//       api1?.scrollNext();
//       api2?.scrollNext();
//     }, 6500);
//   };

//   const stopAutoplay = () => {
//     if (timerRef.current) clearInterval(timerRef.current);
//   };

//   useEffect(() => {
//     if (!api1 && !api2) return;

//     startAutoplay();
//     return () => stopAutoplay();
//   }, [api1, api2]);

//   /** ✅ CARD */
//   const renderCard = (petition: Petition) => (
//     <Link
//       href={`/petitions/${petition.id}`}
//       className="group block h-full"
//     >
//       <AnimatedCard>
//         <Card className="overflow-hidden cursor-pointer transition h-full flex flex-col border border-gray-300">
          
//           <div className="aspect-video w-full overflow-hidden rounded-t-lg">
//             <img
//               src={petition.image || "/placeholder.svg"}
//               alt={petition.title}
//               loading="lazy"
//               className="object-cover w-full h-full"
//             />
//           </div>

//           <CardHeader className="flex flex-col flex-1 p-4">
//             <CardTitle>
//               <H4>{petition.title}</H4>
//               <P className="font-extralight">
//                 {petition.profiles?.full_name || "Unknown"}
//               </P>
//             </CardTitle>

//             <hr className="border-t-2 border-gray-400" />

//             <div className="flex justify-between items-center pt-2 text-xs">
//               <P>Sign Now</P>
//               <P>
//                 {petition.percentRaised}% • {petition.days_active ?? 0} Days left
//               </P>
//             </div>
//           </CardHeader>

//           <div className="mt-auto w-full">
//             <CardContent>
//               <Progress
//                 value={petition.percentRaised}
//                 className="h-2 bg-muted"
//               />
//             </CardContent>

//             <CardFooter>
//               <div className="w-full flex justify-between">
//                 <span className="flex flex-col">
//                   <H4>
//                     {petition.totalAmount.toLocaleString()}
//                   </H4>
//                   <P className="font-light">
//                     Signed of {petition.goal?.toLocaleString()}
//                   </P>
//                 </span>

//                 <DonateButton type="petition" disableLink />
//               </div>
//             </CardFooter>
//           </div>
//         </Card>
//       </AnimatedCard>
//     </Link>
//   );

//   return (
//     <>
//       {/* ✅ MOBILE */}
//       <div className="flex flex-col gap-4 md:hidden mt-6 mb-6">
//         {sortedPetitions.slice(0, 3).map((petition) => (
//           <div key={petition.id}>{renderCard(petition)}</div>
//         ))}

//         <Link href="/petitions" className="w-full">
//           <button className="w-full py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
//             See More
//           </button>
//         </Link>
//       </div>

//       {/* ✅ DESKTOP */}
//       <div className="hidden md:flex flex-col gap-6">

//         {!shouldSplit ? (
//           /* 🔥 SINGLE ROW (fixes your issue) */
//           <Carousel
//             setApi={setApi1}
//             opts={{ loop: true }}
//             onMouseEnter={stopAutoplay}
//             onMouseLeave={startAutoplay}
//           >
//             <CarouselContent className="mt-4">
//               {sortedPetitions.map((petition) => (
//                 <CarouselItem
//                   key={petition.id}
//                   className="md:pl-4 md:basis-[33.33%]"
//                 >
//                   {renderCard(petition)}
//                 </CarouselItem>
//               ))}
//             </CarouselContent>
//           </Carousel>
//         ) : (
//           /* 🔥 TWO ROWS */
//           <>
//             {/* Row 1 */}
//             <Carousel
//               setApi={setApi1}
//               opts={{ loop: true }}
//               onMouseEnter={stopAutoplay}
//               onMouseLeave={startAutoplay}
//             >
//               <CarouselContent className="mt-4">
//                 {firstRow.map((petition) => (
//                   <CarouselItem
//                     key={petition.id}
//                     className="md:pl-4 md:basis-[33.33%]"
//                   >
//                     {renderCard(petition)}
//                   </CarouselItem>
//                 ))}
//               </CarouselContent>
//             </Carousel>

//             {/* Row 2 */}
//             <Carousel
//               setApi={setApi2}
//               opts={{ loop: true }}
//               onMouseEnter={stopAutoplay}
//               onMouseLeave={startAutoplay}
//             >
//               <CarouselContent>
//                 {secondRow.map((petition) => (
//                   <CarouselItem
//                     key={petition.id}
//                     className="md:pl-4 md:basis-[33.33%]"
//                   >
//                     {renderCard(petition)}
//                   </CarouselItem>
//                 ))}
//               </CarouselContent>
//             </Carousel>
//           </>
//         )}

//         {/* ✅ See More */}
//         <div className="flex justify-center mt-4">
//           <Link href="/petitions">
//             <button className="px-6 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
//               See More Petitions
//             </button>
//           </Link>
//         </div>
//       </div>
//     </>
//   );
// }




"use client";

import { useState } from "react";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
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
  };
};

export default function FeaturedPetitionsCarousel({
  petitions,
}: {
  petitions: Petition[];
}) {
  const [api1, setApi1] = useState<any>(null);
  const [api2, setApi2] = useState<any>(null);

  /** ✅ SORT */
  const sortedPetitions = [...petitions].sort((a, b) => {
    const percentA = a.percentRaised || 0;
    const percentB = b.percentRaised || 0;

    if (percentA === 0 && percentB > 0) return 1;
    if (percentB === 0 && percentA > 0) return -1;

    if (percentA !== percentB) return percentB - percentA;

    const daysA = a.days_active ?? Infinity;
    const daysB = b.days_active ?? Infinity;

    return daysA - daysB;
  });

  /** ✅ LAYOUT DECISION */
  const shouldSplit = sortedPetitions.length >= 6;

  const midpoint = Math.ceil(sortedPetitions.length / 2);
  const firstRow = sortedPetitions.slice(0, midpoint);
  const secondRow = sortedPetitions.slice(midpoint);

  /** ✅ CARD */
  const renderCard = (petition: Petition) => (
    <Link
      href={`/petitions/${petition.id}`}
      className="group block h-full"
    >
      <AnimatedCard>
        <Card className="overflow-hidden cursor-pointer transition h-full flex flex-col border border-gray-300">
          
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={petition.image || "/placeholder.svg"}
              alt={petition.title}
              loading="lazy"
              className="object-cover w-full h-full"
            />
          </div>

          <CardHeader className="flex flex-col flex-1 p-4">
            <CardTitle>
              <H4>{petition.title}</H4>
              <P className="font-extralight">
                {petition.profiles?.full_name || "Unknown"}
              </P>
            </CardTitle>

            <hr className="border-t-2 border-gray-400" />

            <div className="flex justify-between items-center pt-2 text-xs">
              <P>Sign Now</P>
              <P>
                {petition.percentRaised}% • {petition.days_active ?? 0} Days left
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
                  <H4>
                    {petition.totalAmount.toLocaleString()}
                  </H4>
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
  );

  return (
    <>
      {/* ✅ MOBILE */}
      <div className="flex flex-col gap-4 md:hidden mt-6 mb-6">
        {sortedPetitions.slice(0, 3).map((petition) => (
          <div key={petition.id}>{renderCard(petition)}</div>
        ))}

        <Link href="/petitions" className="w-full">
          <button className="w-full py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
            See More
          </button>
        </Link>
      </div>

      {/* ✅ DESKTOP */}
      <div className="hidden md:flex flex-col gap-6">

        {!shouldSplit ? (
          /* 🔥 SINGLE ROW */
          <Carousel setApi={setApi1} opts={{ loop: true }}>
            <CarouselContent className="mt-4">
              {sortedPetitions.map((petition) => (
                <CarouselItem
                  key={petition.id}
                  className="md:pl-4 md:basis-[33.33%]"
                >
                  {renderCard(petition)}
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          /* 🔥 TWO ROWS */
          <>
            {/* Row 1 */}
            <Carousel setApi={setApi1} opts={{ loop: true }}>
              <CarouselContent className="mt-4">
                {firstRow.map((petition) => (
                  <CarouselItem
                    key={petition.id}
                    className="md:pl-4 md:basis-[33.33%]"
                  >
                    {renderCard(petition)}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Row 2 */}
            <Carousel setApi={setApi2} opts={{ loop: true }}>
              <CarouselContent>
                {secondRow.map((petition) => (
                  <CarouselItem
                    key={petition.id}
                    className="md:pl-4 md:basis-[33.33%]"
                  >
                    {renderCard(petition)}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </>
        )}

        {/* ✅ See More */}
        <div className="flex justify-center mt-4">
          <Link href="/petitions">
            <button className="px-6 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
              See More Petitions
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}