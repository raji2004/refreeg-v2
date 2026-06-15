"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Accountability() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const triggerStart = window.innerWidth < 768 ? "top 90%" : "top 80%";

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: headlineRef.current,
          start: triggerStart,
          toggleActions: "play none none reverse",
        },
      });

      tl.from(headlineRef.current, {
        opacity: 0,
        y: 40,
        scale: 0.95,
        filter: "blur(4px)",
        duration: 0.8,
        ease: "power3.out",
      })
        .from(
          subRef.current,
          {
            opacity: 0,
            y: 24,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.4" // overlaps slightly with headline
        )
        .from(
          buttonsRef.current?.children || [],
          {
            opacity: 0,
            y: 16,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.15, // cascade effect for buttons
          },
          "-=0.3"
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="bg-[#F1ECDD] px-4 sm:px-8 md:px-20 py-12 sm:py-16 md:py-24 my-16 rounded-2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-56 max-w-6xl mx-auto">
        <h1
          ref={headlineRef}
          className="font-serif font-normal text-[#0D0D0D] text-[clamp(48px,8vw,120px)] leading-[1.0] m-0 text-center md:text-left"
        >
          Giving,
          <br />
          finally
          <br />
          <em className="italic">accountable.</em>
        </h1>

        <div className="flex flex-col justify-center mt-0 md:mt-56 max-w-md">
          <p
            ref={subRef}
            className="text-[#0D0D0D] text-sm sm:text-base leading-relaxed m-0 mb-6 sm:mb-8 text-center md:text-left"
          >
            Whether you give ten dollars or rally ten thousand people,
            RefreeG turns intent into impact you can prove.
          </p>

          <div
            ref={buttonsRef}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <Link
              href="/causes"
              className="flex items-center justify-center gap-2 bg-[#1C3CD5] text-white text-[12px] font-medium rounded-full px-4 py-[14px] hover:opacity-90 transition-colors no-underline w-full sm:w-auto"
            >
              Give to a cause
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight size={14} strokeWidth={2.5} />
              </span>
            </Link>

            <Link
              href="/start-campaign"
              className="flex items-center justify-center text-[#0D0D0D] text-[12px] font-medium rounded-full px-4 py-[14px] border border-[#0D0D0D] hover:bg-black/5 transition-colors no-underline w-full sm:w-auto"
            >
              Start a campaign
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
