import React from "react";
import Hero from "./components/hero";
import TrustSection from "./components/TrustSection";
import FeaturesSection from "./components/FeaturesSection";
import HowItWorksSection from "./components/HowItWorksSection";
import ProofSection from "./components/ProofSection";

const NonProfitsPage = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <TrustSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ProofSection />
    </div>
  );
};

export default NonProfitsPage;
