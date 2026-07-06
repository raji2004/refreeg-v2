"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function RoutedOnChain() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero headline animation
      gsap.from(headlineRef.current, {
        scrollTrigger: {
          trigger: headlineRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 50,
        duration: 1,
        ease: "power3.out",
      });

      // Step-by-step fade-in with stagger
      gsap.from(stepsRef.current?.children || [], {
        scrollTrigger: {
          trigger: stepsRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.25,
      });

      // Background parallax effect
      gsap.to(".bg-image", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          scrub: true,
        },
        yPercent: 20,
        ease: "none",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        className="relative h-screen w-full overflow-hidden mt-8 md:mt-12 lg:mt-16 rounded-lg shadow-lg"
      >
        {/* Background Image */}
        <Image
          src="/routed-funds.svg"
          alt="Routed on chain illustration"
          fill
          priority
          className="object-cover bg-image"
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0" />

        {/* Content */}
        <div className="relative z-10 flex h-full items-center justify-center px-6">
          <div className="max-w-4xl text-center">
            <h2
              ref={headlineRef}
              className="text-3xl md:text-5xl lg:text-7xl font-medium leading-tight"
            >
              ₦48.2M routed <br /> on-chain. Zero <br />lost in translation.
            </h2>
          </div>
        </div>
      </section>

      <section
  ref={stepsRef}
  className="flex flex-col md:flex-row w-full py-16 space-y-8 md:space-y-0 md:space-x-8"
>
  <div className="w-full md:w-1/2 px-4">
    <Image
      src="/trust-with-proof.svg"
      alt="For the people illustration"
      width={1200}
      height={1200}
      className="w-full rounded-lg"
    />
  </div>
  <div className="w-full md:w-1/2 px-4">
    <div className="mb-4 text-xl md:text-2xl font-semibold">
      We replaced trust with proof.<br /> 
      Every action produces a verifiable<br /> artifact you own.
    </div>

    {/* Step 1 */}
    <div className="border-b pb-4 mb-8">
      <div className="flex items-start gap-4 w-full md:w-11/12">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
          1
        </div>
        <div className="space-y-3">
          <div className="font-semibold text-base md:text-lg">Pick a vetted cause.</div>
          <div className="text-sm md:text-base">
            Every campaign is identity-verified, KYB-checked, and signed by a steward.
            Browse education, climate, medical, and disaster relief.
          </div>
        </div>
      </div>
    </div>

    {/* Step 2 */}
    <div className="border-b pb-4 mb-8">
      <div className="flex items-start gap-4 w-full md:w-11/12">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
          2
        </div>
        <div className="space-y-3">
          <div className="font-semibold text-base md:text-lg">Send. It settles in seconds</div>
          <div className="text-sm md:text-base">
            Pay with card, bank, or wallet. Funds land in an on-chain escrow, releasing only on milestones,
            and trigger a receipt minted to your name.
          </div>
        </div>
      </div>
    </div>

    {/* Step 3 */}
    <div className="border-b pb-4 mb-8">
      <div className="flex items-start gap-4 w-full md:w-11/12">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border">
          3
        </div>
        <div className="space-y-3">
          <div className="font-semibold text-base md:text-lg">Follow it all the way home.</div>
          <div className="text-sm md:text-base">
            Photo proof. Vendor receipts. Field updates. Every milestone is timestamped on-chain and pushed
            to your inbox so you see exactly where your money landed.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

    </>
  );
}
