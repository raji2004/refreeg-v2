"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, Zap, CircleCheck, ChevronRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Lock,
    iconColor: "text-white",
    title: "Immutable trail.",
    description:
      "Every donation, transfer, and milestone is signed and timestamped on the chain. No quiet edits. No vanishing transactions.",
    linkLabel: "Public block explorer",
    href: "#",
  },
  {
    icon: Zap,
    iconColor: "text-[#CEF037]",
    title: "Instant settlement.",
    description:
      "Funds reach causes in seconds, not the 4-to-6 weeks legacy platforms take. Critical when relief is time-sensitive.",
    linkLabel: "2.4s median settlement",
    href: "#",
  },
  {
    icon: CircleCheck,
    iconColor: "text-[#CEF037]",
    title: "Zero hidden fees.",
    description:
      "Smart contracts execute on flat, public gas. No 8% off the top. No mystery deductions. Every cent is accounted for in code.",
    linkLabel: "See our fee policy",
    href: "#",
  },
] as const;

export default function WhyOnChain() {
  const sectionRef = useRef<HTMLElement>(null);

  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const heroHeadlineRef = useRef<HTMLHeadingElement>(null);
  const heroSubRef = useRef<HTMLParagraphElement>(null);
  const heroButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const featuresTrigger = {
        trigger: eyebrowRef.current,
        start: "top 78%",
      };

      gsap.from(eyebrowRef.current, {
        scrollTrigger: featuresTrigger,
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: "power2.out",
      });

      gsap.from(headlineRef.current, {
        scrollTrigger: featuresTrigger,
        opacity: 0,
        y: 24,
        duration: 0.75,
        delay: 0.12,
        ease: "power2.out",
      });

      gsap.from(dividerRef.current, {
        scrollTrigger: {
          trigger: dividerRef.current,
          start: "top 80%",
        },
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.8,
        ease: "power2.inOut",
      });

      gsap.from(cardRefs.current, {
        scrollTrigger: {
          trigger: dividerRef.current,
          start: "top 78%",
        },
        opacity: 0,
        y: 32,
        duration: 0.7,
        delay: 0.2,
        stagger: 0.12,
        ease: "power2.out",
      });

      const heroTrigger = {
        trigger: heroHeadlineRef.current,
        start: "top 80%",
      };

      gsap.from(heroHeadlineRef.current, {
        scrollTrigger: heroTrigger,
        opacity: 0,
        y: 32,
        duration: 0.8,
        ease: "power2.out",
      });

      gsap.from(heroSubRef.current, {
        scrollTrigger: heroTrigger,
        opacity: 0,
        y: 20,
        duration: 0.7,
        delay: 0.15,
        ease: "power2.out",
      });

      gsap.from(heroButtonsRef.current, {
        scrollTrigger: heroTrigger,
        opacity: 0,
        y: 16,
        duration: 0.6,
        delay: 0.28,
        ease: "power2.out",
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef}>
      <div className="bg-[#EAE5D8] px-4 sm:px-8 md:px-20 pt-12 sm:pt-16 md:pt-20 pb-0">
        <p
          ref={eyebrowRef}
          className="text-center text-[11px] font-medium tracking-[0.16em] uppercase text-[#1C3CD5] mb-5"
        >
          Why On-Chain
        </p>

        <h2
          ref={headlineRef}
          className="font-serif font-normal text-[#0D0D0D] text-center leading-[1.08] text-[clamp(32px,4.8vw,64px)] max-w-4xl mx-auto mb-12 sm:mb-16 md:mb-20"
        >
          Built for the people who ask{" "}
          <em className="italic">
            &ldquo;where did my money actually go?&rdquo;
          </em>
        </h2>

        <div
          ref={dividerRef}
          className="grid grid-cols-1 md:grid-cols-3 border-t border-[#0D0D0D]/20"
        >
          {features.map(
            (
              { icon: Icon, iconColor, title, description, linkLabel, href },
              i,
            ) => (
              <div
                key={title}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={[
                  "pt-8 sm:pt-10 pb-12 sm:pb-16 flex flex-col",

                  "border-b border-[#0D0D0D]/10 md:border-b-0",

                  i === 0 && "md:pr-12 md:border-b-0",
                  i === 1 &&
                    "md:px-12 md:border-x md:border-[#0D0D0D]/20 md:border-b-0",
                  i === 2 && "md:pl-12 md:border-b-0",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1C3CD5] rounded-xl flex items-center justify-center mb-5 sm:mb-7 shrink-0">
                  <Icon size={20} strokeWidth={1.8} className={iconColor} />
                </div>

                <h3 className="font-serif font-normal text-[#0D0D0D] text-2xl sm:text-[1.75rem] leading-tight mb-3">
                  {title}
                </h3>

                <p className="text-sm leading-relaxed text-[#3D3D3D] mb-6 sm:mb-7">
                  {description}
                </p>

                <Link
                  href={href}
                  className="text-[13px] text-[#0D0D0D]/60 hover:text-[#0D0D0D] transition-colors mt-auto inline-flex items-center gap-1"
                >
                  → {linkLabel}
                </Link>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="bg-[#CEF037] px-4 sm:px-8 md:px-20 py-12 sm:py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
          <h1
            ref={heroHeadlineRef}
            className="font-serif font-normal text-[#0D0D0D] text-[clamp(40px,6.5vw,88px)] leading-[1.1] md:leading-[1.0] m-0 text-center md:text-left"
          >
            Giving,
            <br />
            finally
            <br />
            <em className="italic">accountable.</em>
          </h1>

          <div className="flex flex-col justify-center mt-0 md:mt-24">
            <p
              ref={heroSubRef}
              className="text-[#0D0D0D] text-sm sm:text-base leading-relaxed m-0 mb-6 sm:mb-8 text-center md:text-left"
            >
              Whether you give ten dollars or rally ten thousand people, RefreeG
              turns intent into impact you can prove.
            </p>

            <div
              ref={heroButtonsRef}
              className="flex flex-col sm:flex-row items-center gap-3 sm:gap-3"
            >
              <Link
                href="#"
                className="flex items-center justify-center gap-2 bg-[#1C3CD5] text-white text-[15px] font-medium rounded-full px-6 py-[14px] hover:opacity-90 transition-colors no-underline w-full sm:w-auto"
              >
                Give to a cause
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ChevronRight size={14} strokeWidth={2.5} />
                </span>
              </Link>

              <Link
                href="#"
                className="flex items-center justify-center text-[#0D0D0D] text-[15px] font-medium rounded-full px-6 py-[14px] border border-[#0D0D0D] hover:bg-black/5 transition-colors no-underline w-full sm:w-auto"
              >
                Start a campaign
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
