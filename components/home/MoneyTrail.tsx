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
      "Smart contracts execute on flat, public gas. No 8% off the top. No mystery deductions. Every cent is accounted for in code.",
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
      className={`feature-card w-1/3 px-4 text-left ${
        hasBorder ? "border-r border-white/5" : ""
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

      <h3 className="mb-3 text-2xl font-semibold text-[#FFD8D8]">
        {title}
      </h3>

      <p className="mb-3 text-sm text-white">{description}</p>

      <Link
        href={link.href}
        className="text-xs text-[#CFF454] underline underline-offset-4 transition-opacity hover:opacity-80"
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
      /* ================= HERO TEXT ================= */
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

      /* ================= CARDS STAGGER ================= */
      gsap.from(".feature-card", {
        opacity: 0,
        y: 60,
        duration: 1,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 75%",
        },
      });

      /* ================= ICON FLOAT ================= */
      gsap.to(".feature-icon", {
        y: 6,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.15,
      });

      /* ================= PARALLAX BACKGROUNDS ================= */
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
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="w-full py-5">
      <div className="flex flex-col">
        {/* Top Section */}
        <div className="relative min-h-[600px] w-full">
          <Image
            src="/images/concave-down.svg"
            alt="Top money trail section"
            fill
            priority
            className="money-trail-top-bg object-cover"
          />

          <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
            <div className="max-w-5xl text-center mt-64">
              <h2
                ref={headingRef}
                className="text-3xl md:text-5xl lg:text-5xl font-semibold text-white"
              >
                Built for the people who ask{" "}
                <span className="italic">
                  "Where
                  <br className="hidden md:block" />
                  did my money actually go?"
                </span>
              </h2>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="relative min-h-[600px] w-full">
          <Image
            src="/images/concave-up.svg"
            alt="Bottom money trail section"
            fill
            priority
            className="money-trail-bottom-bg object-cover"
          />

          <div
            ref={cardsRef}
            className="absolute inset-0 z-10 flex items-center justify-center max-w-6xl mx-auto px-6 -mt-72"
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