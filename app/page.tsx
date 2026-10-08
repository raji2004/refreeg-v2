import Hero from "@/components/home/hero";

import LiveCampaigns from "@/components/home/LiveCampaigns";

import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";

import { RoutedOnChain } from "@/components/home/RoutedOnChain";
import { MoneyTrail } from "@/components/home/MoneyTrail";
import { Metadata } from "next";
import Accountability from "@/components/home/Accountability";

export const metadata: Metadata = {
  title: "RefreeG | Powering Social Impact Through Blockchain",
  description:
    "Join RefreeG to launch causes, start petitions, and drive social change with secure, transparent blockchain crowdfunding.",
};

// No request-time data here (LiveCampaigns loads in the browser), so this
// renders statically and can be cached publicly.
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen mt-12 md:mt-16 ">
      <Hero />
      <LiveCampaigns />

      <div className="mx-8">
        <RoutedOnChain />
      </div>

      <AnnouncementMarquee />

      <MoneyTrail />

      <AnnouncementMarquee />

      <div className="mx-8">
        <Accountability />
      </div>
    </div>
  );
}
