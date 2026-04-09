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

// type Cause = {
//   id: string;
//   title: string;
//   image?: string;
//   goal: number;
//   raised: number;
//   days_active?: number;
//   profiles?: {
//     full_name?: string;
//   };
// };

// export default function UrgentCausesCarousel({ causes }: { causes: Cause[] }) {
//   const [api1, setApi1] = useState<any>(null);
//   const [api2, setApi2] = useState<any>(null);

//   const timerRef = useRef<NodeJS.Timeout | null>(null);

//   /** ✅ SORT */
//   const sortedCauses = [...causes].sort((a, b) => {
//     const percentA = a.goal > 0 ? a.raised / a.goal : 0;
//     const percentB = b.goal > 0 ? b.raised / b.goal : 0;

//     if (percentA !== percentB) return percentB - percentA;

//     const daysA = a.days_active ?? Infinity;
//     const daysB = b.days_active ?? Infinity;

//     return daysA - daysB;
//   });

//   /** ✅ SPLIT INTO 2 ROWS */
//   const midpoint = Math.ceil(sortedCauses.length / 2);
//   const firstRow = sortedCauses.slice(0, midpoint);
//   const secondRow = sortedCauses.slice(midpoint);

//   /** ✅ AUTOPLAY BOTH ROWS */
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

//   const renderCard = (cause: Cause) => {
//     const percentRaised =
//       cause.goal > 0
//         ? Math.round((cause.raised / cause.goal) * 100)
//         : 0;

//     return (
//       <Link href={`/causes/${cause.id}`} className="group block h-full">
//         <AnimatedCard>
//           <Card className="overflow-hidden cursor-pointer transition h-full flex flex-col border border-gray-300">
            
//             <div className="aspect-video w-full overflow-hidden rounded-t-lg">
//               <img
//                 src={cause.image || "/placeholder.svg"}
//                 alt={cause.title}
//                 loading="lazy"
//                 className="object-cover w-full h-full"
//               />
//             </div>

//             <CardHeader className="flex flex-col flex-1 p-4">
//               <CardTitle>
//                 <H4>{cause.title}</H4>
//                 <P className="font-extralight">
//                   {cause.profiles?.full_name || "Unknown"}
//                 </P>
//               </CardTitle>

//               <hr className="border-t-2 border-gray-400" />

//               <div className="flex justify-between items-center pt-2 text-xs">
//                 <P>Raised</P>
//                 <P>
//                   {percentRaised}% • {cause.days_active ?? 0} Days left
//                 </P>
//               </div>
//             </CardHeader>

//             <div className="mt-auto w-full">
//               <CardContent>
//                 <Progress value={percentRaised} className="h-2 bg-muted" />
//               </CardContent>

//               <CardFooter>
//                 <div className="w-full flex justify-between">
//                   <span className="flex flex-col">
//                     <H4>₦{cause.raised?.toLocaleString()}</H4>
//                     <P className="font-light">
//                       Funded of ₦{cause.goal?.toLocaleString()}
//                     </P>
//                   </span>

//                   <DonateButton type="cause" disableLink />
//                 </div>
//               </CardFooter>
//             </div>

//           </Card>
//         </AnimatedCard>
//       </Link>
//     );
//   };

//   return (
//     <>
//       {/* ✅ MOBILE (unchanged) */}
//       <div className="flex flex-col gap-4 md:hidden mt-6 mb-6">
//         {sortedCauses.slice(0, 3).map((cause) => (
//           <div key={cause.id}>{renderCard(cause)}</div>
//         ))}

//         <Link href="/causes" className="w-full">
//           <button className="w-full py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
//             See More
//           </button>
//         </Link>
//       </div>

//       {/* ✅ DESKTOP: TWO ROWS */}
//       <div className="hidden md:flex flex-col gap-6">

//         {/* Row 1 */}
//         <Carousel
//           setApi={setApi1}
//           opts={{ loop: true }}
//           onMouseEnter={stopAutoplay}
//           onMouseLeave={startAutoplay}
//         >
//           <CarouselContent className="mt-4">
//             {firstRow.map((cause) => (
//               <CarouselItem
//                 key={cause.id}
//                 className="md:pl-4 md:basis-[33.33%]"
//               >
//                 {renderCard(cause)}
//               </CarouselItem>
//             ))}
//           </CarouselContent>
//         </Carousel>

//         {/* Row 2 */}
//         <Carousel
//           setApi={setApi2}
//           opts={{ loop: true }}
//           onMouseEnter={stopAutoplay}
//           onMouseLeave={startAutoplay}
//         >
//           <CarouselContent>
//             {secondRow.map((cause) => (
//               <CarouselItem
//                 key={cause.id}
//                 className="md:pl-4 md:basis-[33.33%]"
//               >
//                 {renderCard(cause)}
//               </CarouselItem>
//             ))}
//           </CarouselContent>
//         </Carousel>

//         {/* ✅ See More Button */}
//         <div className="flex justify-center mt-4">
//           <Link href="/causes">
//             <button className="px-6 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
//               See More Campaigns
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
  const [api1, setApi1] = useState<any>(null);
  const [api2, setApi2] = useState<any>(null);

  /** ✅ SORT */
  const sortedCauses = [...causes].sort((a, b) => {
    const percentA = a.goal > 0 ? a.raised / a.goal : 0;
    const percentB = b.goal > 0 ? b.raised / b.goal : 0;

    if (percentA !== percentB) return percentB - percentA;

    const daysA = a.days_active ?? Infinity;
    const daysB = b.days_active ?? Infinity;

    return daysA - daysB;
  });

  /** ✅ SPLIT INTO 2 ROWS */
  const midpoint = Math.ceil(sortedCauses.length / 2);
  const firstRow = sortedCauses.slice(0, midpoint);
  const secondRow = sortedCauses.slice(midpoint);

  const renderCard = (cause: Cause) => {
    const percentRaised =
      cause.goal > 0
        ? Math.round((cause.raised / cause.goal) * 100)
        : 0;

    return (
      <Link href={`/causes/${cause.id}`} className="group block h-full">
        <AnimatedCard>
          <Card className="overflow-hidden cursor-pointer transition h-full flex flex-col border border-gray-300">
            
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              <img
                src={cause.image || "/placeholder.svg"}
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
                  {percentRaised}% • {cause.days_active ?? 0} Days left
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
      {/* ✅ MOBILE */}
      <div className="flex flex-col gap-4 md:hidden mt-6 mb-6">
        {sortedCauses.slice(0, 3).map((cause) => (
          <div key={cause.id}>{renderCard(cause)}</div>
        ))}

        <Link href="/causes" className="w-full">
          <button className="w-full py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
            See More
          </button>
        </Link>
      </div>

      {/* ✅ DESKTOP */}
      <div className="hidden md:flex flex-col gap-6">

        {/* Row 1 */}
        <Carousel setApi={setApi1} opts={{ loop: true }}>
          <CarouselContent className="mt-4">
            {firstRow.map((cause) => (
              <CarouselItem
                key={cause.id}
                className="md:pl-4 md:basis-[33.33%]"
              >
                {renderCard(cause)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Row 2 */}
        <Carousel setApi={setApi2} opts={{ loop: true }}>
          <CarouselContent>
            {secondRow.map((cause) => (
              <CarouselItem
                key={cause.id}
                className="md:pl-4 md:basis-[33.33%]"
              >
                {renderCard(cause)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* ✅ See More */}
        <div className="flex justify-center mt-4">
          <Link href="/causes">
            <button className="px-6 py-3 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-100 transition">
              See More Campaigns
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}