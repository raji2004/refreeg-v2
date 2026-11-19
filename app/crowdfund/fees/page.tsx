import React from "react";
import GrowYourBusiness from "@/components/fees/growyourbusiness";
import MoreOnBusiness from "@/components/fees/moreonbusiness";
import AllYouNeed from "@/components/fees/allyouneed";
import FeeBreakdown from "@/components/fees/feebreakdown";
import FundStreamingProtection from "@/components/fees/fundstreamingprotection";
import DonorGuarantee from "@/components/fees/donorguarantee";
import JoinOurCommunity from "@/components/fees/joinourcommunity";
import Numbers from "@/components/marketing/Numbers";
import Hero from "@/components/fees/hero";

export default function Fees() {
  return (
    <div className="flex flex-col gap-6 md:gap-10 lg:gap-16">
      {" "}
      <Hero />
      <FeeBreakdown />
      <AllYouNeed />
      <MoreOnBusiness />
      <FundStreamingProtection />
      <DonorGuarantee />
      <JoinOurCommunity />
      <GrowYourBusiness />
    </div>
  );
}
