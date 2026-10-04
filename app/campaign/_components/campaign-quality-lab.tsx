"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { getBaseURL } from "@/lib/utils";
import { causePublicPath } from "@/lib/causes/slug";
import Image from "next/image";
import Link from "next/link";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import type { CampaignQualityLabProps, TabKey } from "./types/types";
import { stagger } from "./types/types";
import { useCampaignDonation } from "./hooks/use-campaign-donation";
import { HeroSummary } from "./ui/hero-summary";
import { DonateCard } from "./ui/donate-card";
import { TrustPanel } from "./ui/trust-panel";
import { ProgressCard } from "./ui/progress-card";
import { TabsCard } from "./ui/tabs-card";
import { CampaignHealthCard } from "./ui/campaign-health-card";
import { StorySections, CollapsibleStoryText } from "./ui/story-sections";

const MultimediaCarousel = dynamic(
  () => import("@/components/MultimediaCarousel"),
  {
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);

const ProofTimeline = dynamic(
  () =>
    import("@/components/causes/proof-timeline").then(
      (mod) => mod.ProofTimeline,
    ),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-xl" />,
  },
);

export default function CampaignQualityLab({
  cause,
  donors,
  comments,
  profile,
  currentUserId,
  proofUpdates = [],
}: CampaignQualityLabProps) {
  const {
    donation,
    setDonation,
    tip,
    setTip,
    recurring,
    setRecurring,
    serviceFee,
    providerFee,
    totalWithTip,
  } = useCampaignDonation(0);

  const [activeTab, setActiveTab] = useState<TabKey>("Comments");
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const donateRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const donationElement = donateRef.current;
    if (!donationElement || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsDonateVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );

    observer.observe(donationElement);
    return () => observer.disconnect();
  }, []);

  const percentRaised = useMemo(() => {
    if (!cause.goal) return 0;
    return Math.min(Math.round((cause.raised / cause.goal) * 100), 100);
  }, [cause.goal, cause.raised]);

  const media = useMemo(
    () => [...(cause.multimedia || []), ...(cause.video_links || [])],
    [cause.multimedia, cause.video_links],
  );

  const baseUrl = getBaseURL();
  const [shareUrl, setShareUrl] = useState(`${baseUrl}/causes/${cause.id}`);

  useEffect(() => {
    if (typeof window !== "undefined") setShareUrl(window.location.href);
  }, []);

  const formattedDate = useMemo(
    () =>
      new Date(cause.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [cause.created_at],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#10233F] overflow-x-hidden">
      <main className="mx-auto w-full flex flex-col lg:grid max-w-[1280px] gap-4 px-4 pb-24 pt-4 sm:gap-6 sm:px-6 sm:pb-28 sm:pt-6 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] lg:gap-8 lg:px-8 lg:items-start">
        <motion.div
          className="order-1 lg:col-start-1 lg:row-start-1"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <HeroSummary cause={cause} donorsCount={donors.length} />
        </motion.div>
        <aside className="contents lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block lg:self-start">
          <div className="contents lg:sticky lg:top-24 lg:block">
            <div className="order-4" ref={donateRef}>
              <DonateCard
                cause={cause}
                donation={donation}
                setDonation={setDonation}
                recurring={recurring}
                setRecurring={setRecurring}
                tip={tip}
                setTip={setTip}
                serviceFee={serviceFee}
                providerFee={providerFee}
                totalWithTip={totalWithTip}
                profile={profile}
              />
            </div>

            <div className="order-5 lg:mt-6">
              <CampaignHealthCard
                donors={donors}
                causeId={cause.id}
                causePath={causePublicPath(cause)}
                currentUserId={currentUserId}
                isFollowing={cause.isFollowing}
              />
            </div>
          </div>
        </aside>

        <div className="order-2 lg:col-start-1 lg:row-start-2">
          <section className="space-y-4 sm:space-y-6">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0 },
              }}
            >
              {media.length > 0 || cause.image ? (
                <MultimediaCarousel
                  media={media}
                  coverImage={cause.image || undefined}
                  title={cause.title}
                />
              ) : (
                <div className="flex h-64 items-center justify-center bg-slate-100 text-slate-400">
                  No media available
                </div>
              )}
            </motion.div>
            <ProgressCard
              cause={cause}
              percentRaised={percentRaised}
              shareUrl={shareUrl}
            />
          </section>
        </div>

        <div className="order-3 lg:col-start-1 lg:row-start-3">
          <section className="space-y-4 sm:space-y-6">
            <motion.div
              className="rounded-2xl border border-[#DDE3EA] bg-white p-4 text-sm text-[#53647A] sm:rounded-[20px] sm:p-7"
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#235DA7]">
                The story
              </p>

              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#65758B]">
                  <Link
                    href={`/${cause.user.username}`}
                    className="flex items-center gap-2 font-semibold text-[#10233F] hover:text-[#235DA7]"
                  >
                    {cause.user.profile_photo ? (
                      <Image
                        src={getMediaUrl(cause.user.profile_photo)}
                        alt={cause.user.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                        unoptimized={isProxyMediaUrl(
                          getMediaUrl(cause.user.profile_photo),
                        )}
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10233F] text-[9px] text-white">
                        {cause.user.name.slice(0, 1)}
                      </span>
                    )}
                    {cause.user.name}
                  </Link>
                  <span className="text-[#C2CBD5]">•</span>
                  <span className="capitalize">{cause.category}</span>
                  <span className="text-[#C2CBD5]">•</span>
                  <span>{formattedDate}</span>
                </div>

                {cause.sections && cause.sections.length > 0 ? (
                  <StorySections sections={cause.sections} />
                ) : cause.description ? (
                  <CollapsibleStoryText text={cause.description} />
                ) : (
                  <p className="text-sm text-[#65758B]">
                    No story yet. The campaign creator can add the full context
                    and plan here.
                  </p>
                )}
              </div>
            </motion.div>
          </section>
        </div>

        <div className="order-5 space-y-4 sm:space-y-6 lg:col-start-1 lg:row-start-4">
          <section className="space-y-4 sm:space-y-6">
            <TrustPanel baseUrl={baseUrl} cause={cause} />
            <ProofTimeline updates={proofUpdates} />
          </section>

          <section>
            <TabsCard
              cause={cause}
              formattedDate={formattedDate}
              comments={comments}
              currentUserId={currentUserId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </section>
        </div>
      </main>

      {!isDonateVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D8E0E8] bg-white/95 px-4 py-3 shadow-[0_-16px_40px_rgba(16,35,63,0.14)] backdrop-blur-xl sm:hidden">
          <div className="mx-auto flex max-w-md items-center gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#65758B]">
                Raised
              </p>
              <p className="truncate text-sm font-bold text-[#10233F]">
                ₦{cause.raised.toLocaleString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                donateRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="flex-1 rounded-xl bg-[#235DA7] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(35,93,167,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7]"
            >
              Donate now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
