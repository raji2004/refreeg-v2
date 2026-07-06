"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

import gsap from "gsap";

import { Button } from "@/components/ui/button";

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", {
        y: -20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      gsap.from(".hero-title", {
        y: 60,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: "power4.out",
      });

      gsap.from(".hero-description", {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.5,
        ease: "power3.out",
      });

      gsap.from(".hero-buttons", {
        y: 20,
        opacity: 0,
        duration: 0.8,
        delay: 0.8,
        ease: "power3.out",
      });

      gsap.from(".hero-image", {
        scale: 0.9,
        opacity: 0,
        duration: 1.4,
        delay: 0.4,
        ease: "power3.out",
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background px-4 sm:px-6">
      
      {/* Background Glow */}
      <div className="absolute top-[-200px] left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#0A3CB5]/20 blur-3xl" />

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/40 to-background z-0" />

      {/* Content */}
      <div
        ref={heroRef}
        className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center text-center md:pt-0 sm:pt-28"
      >
        
        {/* Badge */}
        <div className="hero-badge flex items-center gap-2 rounded-full border border-border bg-[#CFF454] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0B1410] shadow-md">
          <Image
            src="/dot.svg"
            alt="On-chain Icon"
            width={8}
            height={8}
          />
          <span className="whitespace-nowrap">
            Live on-chain · 10,000+ donations verified
          </span>
        </div>

        {/* Heading */}
        <h1 className="hero-title mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
          Give and see <br className="hidden sm:block" /> 
          exactly where <br className="hidden sm:block" />it{" "}
          <span className="italic text-[#0A3CB5]">
            lands.
          </span>
        </h1>

        {/* Description */}
        <p className="hero-description mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">
          RefreeG puts every naira on-chain. Donors get a receipt, not a
          brochure. Causes get funded in seconds, not weeks. No black box, no
          trust tax — just verifiable giving.
        </p>

        {/* Buttons */}
        <div className="hero-buttons mt-6 flex flex-col items-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="w-full rounded-full bg-[#0A3CB5] px-8 text-white shadow-xl sm:w-auto"
          >
            <Link href="/donate">
              Give to a cause
              <Image
                src="/arrow.svg"
                alt="Arrow Icon"
                width={12}
                height={12}
                className="inline-block"
              />
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full rounded-full border-border bg-background/70 px-8 backdrop-blur-md sm:w-auto"
          >
            <Link href="/learn">Raise for one</Link>
          </Button>
        </div>

        {/* Hero Image */}
        <div className="hero-image w-full max-w-4xl px-2 sm:px-6">
          <Image
            src="/heropage.png"
            alt="Hero Background"
            width={1400}
            height={900}
            priority
            className=" w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
