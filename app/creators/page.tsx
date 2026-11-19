import BottomHero from "@/components/creators/bottomhero";
import CreatorStory from "@/components/creators/creatorstory";
import CreatorTrust from "@/components/creators/creatortrust";
import GetStarted from "@/components/creators/getstarted";
import GrowMoney from "@/components/creators/growmoney";
import HelpCreators from "@/components/creators/helpcreators";
import Hero from "@/components/creators/hero";
import InvestEasy from "@/components/creators/investeasy";
import Numbers from "@/components/marketing/Numbers";
import React from "react";

export default function Creators() {
  return (
    <div className="flex flex-col gap-6 md:gap-10 lg:gap-16">
      <Hero />
      <Numbers />
      <CreatorTrust />
      <CreatorStory />
      <GetStarted />
      <HelpCreators />
      <GrowMoney />
      <InvestEasy />
      <BottomHero />
    </div>
  );
}
