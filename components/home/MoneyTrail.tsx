"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: "/images/lock.svg",
    iconWidth: 24,
    iconHeight: 24,
    title: "Immutable trail.",
    description:
      "Every donation, transfer, and milestone is signed and timestamped on the chain. No quiet edits. No vanishing transactions.",
    link: {
      label: "Public block explorer",
      href: "/block-explorer",
    },
  },
  {
    icon: "/images/lightening.svg",
    iconWidth: 24,
    iconHeight: 20,
    title: "Instant settlement.",
    description:
      "Funds reach causes in seconds, not the 4-to-6 weeks legacy platforms take. Critical when relief is time-sensitive.",
    link: {
      label: "2.4s median settlement",
      href: "/settlement-metrics",
    },
  },
  {
    icon: "/images/check.svg",
    iconWidth: 24,
    iconHeight: 24,
    title: "Zero hidden fees.",
    description:
      "Smart contracts execute on flat, public gas. No 8% off the top. No mystery deductions. Every kobo is accounted for in code.",
    link: {
      label: "See our fee policy",
      href: "/fee-policy",
    },
  },
];

type FeatureCardProps = {
  icon: string;
  iconWidth: number;
  iconHeight: number;
  title: string;
  description: string;
  link: {
    label: string;
    href: string;
  };
  hasBorder?: boolean;
};

function FeatureCard({
  icon,
  iconWidth,
  iconHeight,
  title,
  description,
  link,
  hasBorder = false,
}: FeatureCardProps) {
  return (
    <div
      className={`feature-card w-full md:w-1/3 px-4 py-8 text-left ${
        hasBorder
          ? "border-b md:border-b-0 md:border-r border-white/10"
          : ""
      }`}
    >
      <div className="feature-icon inline-flex rounded-full bg-[#CFF454] p-2 mb-6">
        <Image
          src={icon}
          alt={title}
          width={iconWidth}
          height={iconHeight}
        />
      </div>

      <h3 className="mb-3 md:mb-2 lg:mb-3 text-xl lg:text-2xl font-semibold text-[#FFD8D8]">
        {title}
      </h3>

      <p className="mb-4 md:mb-2 lg:mb-3  text-sm md:text-base text-white leading-relaxed">
        {description}
      </p>

      <Link
        href={link.href}
        className="text-xs md:text-sm text-[#CFF454] underline underline-offset-4 transition-opacity hover:opacity-80"
      >
        → {link.label}
      </Link>
    </div>
  );
}

export function MoneyTrail() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power4.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 80%",
          },
        }
      );

      gsap.from(".feature-card", {
        opacity: 0,
        y: 60,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 85%",
        },
      });

      gsap.to(".feature-icon", {
        y: 6,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.15,
      });

      if (window.innerWidth >= 768) {
        gsap.to(".money-trail-top-bg", {
          yPercent: 10,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });

        gsap.to(".money-trail-bottom-bg", {
          yPercent: -10,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full py-10 md:py-5 bg-[#0A3CB5] md:bg-transparent overflow-hidden"
    >
      <div className="flex flex-col">
        {/* Top Section */}
        <div className="relative min-h-[280px] sm:min-h-[350px] md:min-h-[600px] w-full">
          <Image
            src="/images/concave-down.svg"
            alt="Top money trail section"
            fill
            priority
            className="money-trail-top-bg object-cover hidden md:block"
          />

          <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
            <div className="max-w-5xl text-center mt-0 md:mt-64">
              <h2
                ref={headingRef}
                className="text-[32px] sm:text-[40px] md:text-5xl lg:text-5xl font-semibold text-white leading-[1.1]"
              >
                <span className="md:hidden">
                  Built for the people who ask
                  <span className="italic block mt-2">
                    &quot;Where did my money actually go?&quot;
                  </span>
                </span>

                <span className="hidden md:inline">
                  Built for the people who ask{" "}
                  <span className="italic">
                    &quot;Where
                    <br />
                    did my money actually go?&quot;
                  </span>
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="relative md:min-h-[600px] w-full">
          <Image
            src="/images/concave-up.svg"
            alt="Bottom money trail section"
            fill
            priority
            className="money-trail-bottom-bg object-cover hidden md:block"
          />

          <div
            ref={cardsRef}
            className="
              relative
              md:absolute
              md:inset-0
              z-10
              flex
              flex-col
              md:flex-row
              items-stretch
              md:items-center
              justify-center
              max-w-6xl
              mx-auto
              px-6
              py-10
              md:py-0
              md:-mt-72
            "
          >
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                {...feature}
                hasBorder={index !== features.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
