import React from "react";
import Hero from "./components/hero";
import HowItWorks from "./components/howitworks";
import LifeMatters from "./components/lifematters";
import Image from "next/image";
import ReliefPowered from "./components/healthcaresupport";

export default function HowToStartACause() {
  return (
    <div>
      <Hero />

      <HowItWorks />

      {}
      <div className="flex justify-center mx-10 mt-10">
        <Image
          src="/video-shot.png"
          alt="divider"
          width={1200}
          height={100}
          className="w-full h-auto rounded-lg"
        />
      </div>

      <ReliefPowered />

      <LifeMatters />
    </div>
  );
}
