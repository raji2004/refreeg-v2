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

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ testGlobalSupportError?: string }>;
}) {
  const params = await searchParams;

  if (
    process.env.NODE_ENV === "development" &&
    params?.testGlobalSupportError === "1"
  ) {
    throw new Error("Test support screen");
  }

  return (
    <div className="flex flex-col min-h-screen mt-12 md:mt-16 ">
      <Hero />

      <div className="mx-8"></div>

      <div className="mx-8">
        <RoutedOnChain />
      </div>

      <AnnouncementMarquee />

      <MoneyTrail />

      <AnnouncementMarquee />

      <LiveCampaigns />

      <div className="mx-8">
        <Accountability />
      </div>
    </div>
  );
}
