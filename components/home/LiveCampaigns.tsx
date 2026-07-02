"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { listCauses } from "@/actions";
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Campaign = {
  id: string;
  title: string;
  image?: string;
  goal: number;
  raised: number;
  category: string;
  location: string;
};

export default function LiveCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const allCauses = await listCauses();
        const transformedCampaigns = allCauses.map((cause) => ({
          id: cause.id,
          title: cause.title,
          image: cause.image ?? undefined,
          goal: cause.goal ?? 0,
          raised: cause.raised ?? 0,
          category: cause.category || "CAUSE",
          location: cause.location || "GLOBAL",
        }));
        setCampaigns(transformedCampaigns);
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (loading || campaigns.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.from(headerRef.current, {
        scrollTrigger: {
          trigger: headerRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: "power2.out",
      });

      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.from(card, {
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
            opacity: 0,
            y: 50,
            duration: 0.6,
            delay: index * 0.1,
            ease: "power2.out",
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [loading, campaigns]);

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollHint(false);
      checkScrollButtons();
    };

    container.addEventListener("scroll", handleScroll);
    // Check initially
    checkScrollButtons();
    // Check on resize
    window.addEventListener("resize", checkScrollButtons);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", checkScrollButtons);
    };
  }, [campaigns]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 320;
    const targetScroll =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3"></div>
              <div className="h-12 w-96 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse mb-8"></div>
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="min-w-[280px] md:min-w-[320px] bg-gray-100 rounded-2xl h-96 animate-pulse flex-shrink-0"
              ></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (campaigns.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500">No campaigns available</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={headerRef} className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[#1C3CD5] mb-3">
              LIVE ON REFREEG
            </p>
            <h2 className="font-serif font-normal text-[#0D0D0D] text-4xl md:text-5xl lg:text-6xl leading-[1.08]">
              Real causes. Real receipts.
            </h2>
          </div>
          <Link
            href="/causes"
            className="hidden md:flex items-center gap-2 text-[#1C3CD5] font-medium text-sm hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            View all
            <ChevronRight size={16} />
          </Link>
        </div>

        <p className="text-gray-600 max-w-2xl text-base mb-8">
          A glimpse of what's funding right now. Each campaign is verified,
          every dollar tracked from contribution to impact.
        </p>

        {showScrollHint && (
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 animate-pulse">
            <ChevronsLeft size={14} className="text-[#1C3CD5] sm:hidden" />
            <ChevronsLeft
              size={16}
              className="text-[#1C3CD5] hidden sm:block"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-500 tracking-wide text-center">
              <span className="sm:hidden">← Swipe to explore →</span>
              <span className="hidden sm:inline">
                Swipe to explore more campaigns
              </span>
            </span>
            <ChevronsRight size={14} className="text-[#1C3CD5] sm:hidden" />
            <ChevronsRight
              size={16}
              className="text-[#1C3CD5] hidden sm:block"
            />
          </div>
        )}

        <div className="relative">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-1.5 sm:p-2 border border-gray-200 transition-all duration-200 -ml-2 sm:-ml-4 flex items-center justify-center"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} className="text-gray-700 sm:hidden" />
              <ChevronLeft
                size={20}
                className="text-gray-700 hidden sm:block"
              />
            </button>
          )}

          <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-white to-transparent pointer-events-none sm:hidden z-10" />
          <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden z-10" />

          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {campaigns.map((campaign, index) => {
              const percentRaised =
                campaign.goal > 0
                  ? Math.round((campaign.raised / campaign.goal) * 100)
                  : 0;

              return (
                <Link href={`/causes/${campaign.id}`} key={campaign.id}>
                  <div
                    ref={(el) => {
                      cardsRef.current[index] = el;
                    }}
                    className="group cursor-pointer flex-shrink-0 w-[280px] md:w-[320px]"
                  >
                    <div className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative">
                      {/* Image */}
                      <div className="aspect-[4/3] w-full overflow-hidden relative bg-gray-100">
                        <Image
                          src={
                            getMediaUrl(campaign.image) || "/placeholder.svg"
                          }
                          alt={campaign.title}
                          fill
                          sizes="(max-width: 768px) 280px, 320px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized={isProxyMediaUrl(
                            getMediaUrl(campaign.image),
                          )}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-[#CEF037] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                          LIVE
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {campaign.category} · {campaign.location}
                        </div>

                        <h3 className="font-semibold text-gray-900 text-base leading-tight mb-4 line-clamp-2">
                          {campaign.title}
                        </h3>

                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-2xl font-bold text-gray-900">
                            {formatCurrency(campaign.raised)} raised
                          </span>
                          <span className="text-sm text-gray-500">
                            of {formatCurrency(campaign.goal)}
                          </span>
                        </div>

                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-[#1C3CD5] h-1 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(percentRaised, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-1.5 sm:p-2 border border-gray-200 transition-all duration-200 -mr-2 sm:-mr-4 flex items-center justify-center"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} className="text-gray-700 sm:hidden" />
              <ChevronRight
                size={20}
                className="text-gray-700 hidden sm:block"
              />
            </button>
          )}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link
            href="/causes"
            className="inline-flex items-center gap-2 text-[#1C3CD5] font-medium text-sm hover:opacity-80 transition-opacity"
          >
            View all campaigns
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
