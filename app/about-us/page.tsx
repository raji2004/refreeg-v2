import Image from "next/image";
import { Metadata } from "next";

import Accountability from "@/components/home/Accountability";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";

import { AboutHero } from "./_components/AboutHero";
import { AboutMission } from "./_components/AboutMission";
import { AboutPillars } from "./_components/AboutPillars";
import { PeopleBehind } from "./_components/PeopleBehind";

export const metadata: Metadata = {
  title: "About RefreeG | Transparent Crowdfunding",
  description:
    "RefreeG connects people who care with causes that matter. Every donation is tracked, so you can see exactly where your money lands.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col bg-surface">
      <AboutHero />

      <div className="px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="relative mx-auto aspect-[4/3] max-w-7xl overflow-hidden rounded-xl sm:aspect-[1312/620]">
          <Image
            src="/about/hands.jpg"
            alt="Hands of different people reaching together against a blue sky"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
          />
        </div>
      </div>

      <AnnouncementMarquee />

      <AboutMission />

      <AboutPillars />

      <div className="mx-auto w-full max-w-7xl px-4 pt-16 sm:px-6 md:pt-24 lg:px-8">
        <PeopleBehind />
      </div>

      <div className="mx-8">
        <Accountability />
      </div>
    </div>
  );
}
