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

import { Metadata } from "next";

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
      <AnnouncementMarquee />
      <Hero />

      <div className="mx-8">
        <Numbers />
      </div>

      <div className="mx-8">
        <LaunchYourCauseInSeconds />
      </div>

      <div className="mx-8">
        <UrgentCauses />
      </div>

      <div className="">
        <WhyItStandsOut />
      </div>

      <div className="mx-8">
        <TrendingCauses />
      </div>

      <div className="mx-8">
        <FeaturedPetitions />
      </div>

      <ProofFeatureSplit />

      <div className="">
        <HowitWorksYT />
      </div>

      <CTASection />

      <div id="faq" className="md:mx-8">
        <FAQ />
      </div>
    </div>
  );
}
