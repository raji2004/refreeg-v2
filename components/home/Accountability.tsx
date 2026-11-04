"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type AccountabilityProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

const defaultTitle = (
  <>
    Giving,
    <br />
    finally
    <br />
    <em className="italic">accountable.</em>
  </>
);

const defaultActions = (
  <>
    <Link
      href="/causes"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-brand-blue-foreground transition-colors hover:bg-brand-blue/90"
    >
      Give to a cause
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>

    <Link
      href="/dashboard/causes/create"
      className="inline-flex items-center justify-center rounded-full border border-ink px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
    >
      Start a campaign
    </Link>
  </>
);

export default function Accountability({
  title = defaultTitle,
  description = "Whether you give ₦10 or rally ten thousand people, RefreeG turns intent into impact you can prove.",
  actions = defaultActions,
}: AccountabilityProps) {
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
          "-=0.4",
        )
        .from(
          buttonsRef.current?.children || [],
          {
            opacity: 0,
            y: 16,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.15,
          },
          "-=0.3",
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="my-16 rounded-2xl bg-warm-neutral px-6 py-14 sm:px-10 md:py-20 lg:px-16 lg:py-24 xl:px-24"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-[1.2fr_1fr] md:gap-10 lg:gap-16">
        <h2
          ref={headlineRef}
          className="m-0 text-center font-fraunces text-[40px] font-normal leading-[1.02] tracking-tight text-ink sm:text-[52px] md:text-left lg:text-[64px] xl:text-[80px]"
        >
          {title}
        </h2>

        <div className="mx-auto flex max-w-md flex-col md:mx-0">
          <p
            ref={subRef}
            className="m-0 mb-6 text-center text-sm leading-relaxed text-ink/70 sm:text-base md:text-left"
          >
            {description}
          </p>

          <div
            ref={buttonsRef}
            className="flex flex-wrap items-center justify-center gap-3 md:justify-start"
          >
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
