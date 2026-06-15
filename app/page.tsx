import { FeaturedCauses } from "@/components/home/featured-causes";
import Hero from "@/components/home/hero";
import FAQ from "@/components/home/frequentlyAskedQuestions";
import AdBanner from "@/components/AdBanner";
import LaunchYourCauseInSeconds from "@/components/home/launchYourCauseInSeconds";
import { TrendingCauses } from "@/components/home/trendingNow";
import WhyItStandsOut from "@/components/home/whyitStandsOut";
import HowitWorksYT from "@/components/home/howitWorksYT";
import { FeaturedPetitions } from "@/components/home/featured-petitions";
import { UrgentCauses } from "@/components/home/urgentCauses";
import CTASection from "@/components/home/cta-section";
import Numbers from "@/components/numbers";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";
import ProofFeatureSplit from "@/components/home/proof-feature-split";
import WhyOnChain from "@/components/home/WhyOnChain";
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

      <div className="mx-8">
        {/* <Numbers /> */}
      </div>

      <div className="mx-8">
        <RoutedOnChain />
        {/* <LaunchYourCauseInSeconds /> */}
      </div>
      <AnnouncementMarquee />

      <MoneyTrail />

      <AnnouncementMarquee />

      <div className="mx-8">
        <Accountability />
      </div>

      <ProofFeatureSplit />

      <WhyOnChain />

      <div className="mx-8">
        <UrgentCauses />
      </div>

      <div className="">
        {/* <WhyItStandsOut /> */}
      </div>

      <div className="mx-8">
        <TrendingCauses />
      </div>

      <div className="mx-8">
        <FeaturedPetitions />
      </div>

      

      <div className="">
        {/* <HowitWorksYT /> */}
      </div>

      <CTASection />

      <div id="faq" className="md:mx-8">
        <FAQ />
      </div>
    </div>
  );
}
