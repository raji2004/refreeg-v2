"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Heading, Lead } from "@/components/marketing/Typography";
import { useGsap } from "@/hooks/use-gsap";

import { useCases } from "../_data/use-cases";

export function CrowdfundHero() {
  const heroRef = useRef<HTMLElement>(null);

  useGsap((gsap) => {
    gsap.from(".cf-hero-reveal", {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.15,
    });
  }, heroRef);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden bg-surface px-4 pb-16 pt-20 sm:px-6 md:pb-24 md:pt-28"
    >
      <div className="absolute left-1/2 top-[-200px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-accent/15 blur-3xl" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
        <span className="cf-hero-reveal inline-flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-xs font-semibold text-ink shadow-md sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-accent" />
          {useCases.length} ways to raise on Refreeg
        </span>

        <Heading
          as="h1"
          size="display"
          className="cf-hero-reveal mt-6 lg:text-8xl"
        >
          Raise for what <br className="hidden sm:block" />
          <em className="text-blue-accent">matters</em> to you.
        </Heading>

        <Lead className="cf-hero-reveal mt-6 max-w-xl">
          A hospital bill, a flood response, your debut EP. Whatever you raise
          for, funds sit in escrow and release on milestones, with proof donors
          can check.
        </Lead>

        <div className="cf-hero-reveal mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/dashboard/causes/create"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-accent px-8 py-3.5 text-sm font-medium text-white shadow-xl transition-colors hover:bg-blue-accent/90 sm:w-auto"
          >
            Start a cause
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/causes"
            className="inline-flex w-full items-center justify-center rounded-full border border-ink px-8 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5 sm:w-auto"
          >
            See what&apos;s live
          </Link>
        </div>
      </div>
    </section>
  );
}
