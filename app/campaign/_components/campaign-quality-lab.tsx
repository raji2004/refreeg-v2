"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  HandHeart,
  Image as ImageIcon,
  MapPin,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
  Share2,
  Target,
  Users,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import type { Cause } from "@/types";
import dynamic from "next/dynamic";
import { Progress } from "@/components/ui/progress";
import { getBaseURL, calculateServiceFee, cn } from "@/lib/utils";
import { getCampaignCategoryStyle } from "@/lib/campaign-categories";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Comment } from "@/types/common-types";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { followCampaign } from "@/actions/cause-actions";
import { SupportErrorCta } from "@/components/support-error-cta";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BreetCryptoDonationModal } from "@/components/crypto-details/BreetCryptoDonationModal";
import { ImageLightbox } from "@/components/ImageLightbox";

const DonationForm = dynamic(
  () => import("@/components/donation-form").then((mod) => mod.DonationForm),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
  },
);

// const SolanaDonationButtonWrapper = dynamic(
//   () =>
//     import("@/components/crypto-details/Solana[Redacted]/SolanaDonationButtonWrapper"),
//   {
//     loading: () => <Skeleton className="h-10 w-full rounded-full" />,
//     ssr: false,
//   },
// );

const ShareModal = dynamic(
  () => import("@/components/share-modal").then((mod) => mod.ShareModal),
  {
    loading: () => <Skeleton className="h-10 w-10 rounded-full" />,
  },
);

const MultimediaCarousel = dynamic(
  () => import("@/components/MultimediaCarousel"),
  {
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  },
);

const CommentsSection = dynamic(
  () =>
    import("@/components/comments/comment-section").then(
      (mod) => mod.CommentsSection,
    ),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-xl" />,
  },
);

const tabs = ["Updates", "Comments", "FAQ"] as const;
const donationPresets = [1000, 10000, 100000, 1000000];
const tipPresets = [100, 500, 1000];

const trustTiles = (cause: CauseDetail) => [
  {
    title: "Milestone escrow",
    status: cause.verified_status === "verified" ? "Active" : "Pending",
    badgeClass:
      cause.verified_status === "verified" ? "bg-[#22C55E]" : "bg-[#F59E0B]",
    badgeTextClass: "text-white",
    body: "Funds release only after proof review.",
  },
  {
    title: "Evidence review",
    status: "Active", // This could be dynamic if we track pending edits count
    badgeClass: "bg-[#2563EB]",
    badgeTextClass: "text-white",
    body: "Latest upload awaiting approval.",
  },
  {
    title: "Impact score",
    status: cause.trust_score?.impact || "B+",
    badgeClass: "bg-[#2563EB]",
    badgeTextClass: "text-white",
    body: "Strong delivery confidence.",
  },
  {
    title: "Transparency",
    status: cause.trust_score?.transparency || "High",
    badgeClass: "bg-[#E5E7EB]",
    badgeTextClass: "text-[#0F172A]",
    body: "Open financials and updates.",
  },
];

const defaultFaqs = [
  {
    question: "How does milestone escrow work?",
    answer:
      "Funds are held until proof is uploaded and reviewed. Each release is logged in the public audit trail.",
  },
  {
    question: "Can I donate without an account?",
    answer:
      "Yes. Guest donations require only an email for receipts and updates.",
  },
  {
    question: "What happens if a milestone fails?",
    answer:
      "Releases pause. The campaign must submit a revised plan or refunds are offered based on policy.",
  },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger: any = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

type TabKey = (typeof tabs)[number];

type ProfileSummary = {
  email: string;
  name: string;
  id: string;
  subaccount: string;
};

type Donor = {
  id: string;
  name?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

type CauseDetail = Cause & {
  user: {
    name: string;
    email: string;
    sub_account_code?: string | null;
    username: string;
    profile_photo?: string | null;
  };
  sections?: { heading: string; description: string }[];
  summary?: string | null;
  location?: string | null;
  verified_status?: string;
  trust_score?: {
    impact: string;
    readability: string;
    transparency: string;
  };
  multimedia?: string[];
  video_links?: string[];
  faqs?: { question: string; answer: string }[];
  isFollowing?: boolean;
};

type CampaignQualityLabProps = {
  cause: CauseDetail;
  donors: Donor[];
  comments: Comment[];
  profile: ProfileSummary;
  creatorHasWallet: boolean;
  currentUserId?: string;
};

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3 text-sm shadow-[0_14px_35px_-24px_rgba(31,75,153,0.45)] backdrop-blur-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E7F0FF] text-[#2457D6]">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#72829A]">
          {label}
        </p>
        <p className="mt-0.5 truncate font-semibold text-[#10233F]">{value}</p>
      </div>
    </div>
  );
}

function HeaderMeta({
  status,
  formattedDate,
  trustScore,
  cause,
  profile,
}: {
  status: string;
  formattedDate: string;
  trustScore?: string;
  cause: CauseDetail;
  profile: ProfileSummary;
}) {
  const resolvedTrustScore = trustScore || "B+";
  const router = useRouter();

  return (
    <motion.div variants={fadeUp}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#2457D6] px-3.5 py-2 font-bold text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>{status === "approved" ? "Verified" : "In review"}</span>
          </span>

          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-2 font-medium text-[#10233F] backdrop-blur-sm"
            title="Impact score reflects plan clarity, transparency, and available campaign evidence."
            aria-label={`Impact score ${resolvedTrustScore}. Based on plan clarity, transparency, and available campaign evidence.`}
          >
            <BadgeCheck className="h-4 w-4 text-[#2457D6]" />
            <span className="uppercase tracking-[0.18em] text-[9px] text-[#72829A]">
              Trust
            </span>
            <span className="font-bold">{resolvedTrustScore}</span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-2 font-medium text-[#53647A] backdrop-blur-sm">
            <CalendarClock className="h-4 w-4 text-[#72829A]" />
            <span className="hidden uppercase tracking-[0.18em] text-[9px] text-[#72829A] sm:inline">
              Updated
            </span>
            <span className="font-semibold text-[#10233F]">
              {formattedDate}
            </span>
          </span>
        </div>

        {/* RIGHT: Pledge button hidden for now
        <div className="w-full sm:w-auto">
          <Button
            onClick={() => router.push(`/causes/${cause.id}/pledge`)}
            className="w-full gap-x-1 sm:w-auto rounded-full bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#1E293B]"
          >
            <HandHeart className="h-4 w-4 text-white" />
            Make a Pledge
          </Button>
        </div>
        */}
      </div>
    </motion.div>
  );
}

function HeroSummary({
  cause,
  donorsCount,
}: {
  cause: CauseDetail;
  donorsCount: number;
}) {
  const verified = cause.status === "approved";
  const categoryStyle = getCampaignCategoryStyle(cause.category);
  const CategoryIcon = categoryStyle.icon;

  return (
    <motion.div
      className="rounded-2xl border border-[#CBD7E4] bg-[linear-gradient(135deg,#F9FCFF_0%,#E6F0FF_52%,#EEF8F6_100%)] p-4 sm:rounded-[22px] sm:p-7"
      variants={fadeUp}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
            verified
              ? "bg-[#2563EB]/10 text-[#2563EB]"
              : "bg-[#F59E0B]/15 text-[#B66A00]"
          }`}
        >
          <BadgeCheck className="h-3.5 w-3.5" />
          {verified ? "Verified" : "In review"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold",
            categoryStyle.badgeClassName,
          )}
        >
          <CategoryIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {categoryStyle.name} cause
        </span>
      </div>

      <div className="flex max-w-3xl flex-col gap-3 sm:gap-4">
        <h1 className="text-2xl font-extrabold leading-[1.2] tracking-[-0.02em] text-[#10233F] sm:text-[32px]">
          {cause.title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[#53647A] sm:text-[15px] sm:leading-7">
          {cause.summary ||
            "Verified, milestone-based relief with evidence-locked releases and transparent updates."}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[#33445A] sm:text-[13px]">
          {cause.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#235DA7]" />
              {cause.location}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-[#235DA7]" />
            {donorsCount} supporters
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function TrustPanel({
  baseUrl,
  cause,
}: {
  baseUrl: string;
  cause: CauseDetail;
}) {
  const proofMedia = useMemo(() => {
    const allMedia =
      cause.multimedia && cause.multimedia.length > 0
        ? cause.multimedia
        : cause.image
          ? [cause.image]
          : [];

    // Filter out videos and only show images in the proof thumbnails
    return allMedia
      .filter((url) => {
        const isVideo =
          url.match(/\.(mp4|mov|webm)$/i) ||
          url.match(/(youtube\.com|youtu\.be|tiktok\.com|drive\.google\.com)/i);
        return !isVideo;
      })
      .reverse(); // Show latest first
  }, [cause.image, cause.multimedia]);
  const [failedEvidence, setFailedEvidence] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedProofIndex, setExpandedProofIndex] = useState<number | null>(
    null,
  );
  const visibleProofMedia = useMemo(
    () => proofMedia.filter((item) => !failedEvidence.has(item)),
    [failedEvidence, proofMedia],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const tiles = trustTiles(cause);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl bg-[linear-gradient(165deg,#10233F_0%,#0C1B33_100%)] text-white sm:rounded-[20px]"
      variants={fadeUp}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:gap-4 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D9FF5B] text-[#10233F]">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-white">
                Verified and escrow protected
              </p>
              <p className="mt-0.5 truncate text-xs text-white/60">
                View trust details and campaign evidence
              </p>
            </div>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-white/60 transition-transform group-open:rotate-180" />
        </summary>

        <div className="border-t border-white/10 px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex justify-end">
            <ShareModal
              url={`${baseUrl}/causes/${cause.id}`}
              title={cause.title}
              entityId={cause.id}
              entityType="cause"
            />
          </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {tiles.map((tile: any) => (
          <div
            key={tile.title}
            className="rounded-2xl border border-white/15 bg-white/[0.055] p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/60">
                {tile.title}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tile.badgeClass} ${tile.badgeTextClass}`}
              >
                {tile.status}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-white/80">
              {tile.body}
            </p>
          </div>
        ))}
      </div>

      {visibleProofMedia.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/60">
              Campaign evidence
            </p>
            <span className="text-[11px] text-white/45">
              {visibleProofMedia.length}{" "}
              {visibleProofMedia.length === 1 ? "image" : "images"}
            </span>
          </div>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
            {visibleProofMedia.map((item: any, index: any) => (
              <button
                key={`${item}-${index}`}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label="View evidence image full size"
                className="group relative aspect-[4/3] w-[78%] shrink-0 snap-center overflow-hidden rounded-xl border border-white/15 bg-[#08162B] sm:aspect-video sm:w-auto"
              >
                <Image
                  src={getMediaUrl(item)}
                  alt=""
                  fill
                  className="scale-110 object-cover opacity-35 blur-xl"
                  loading="lazy"
                  unoptimized={isProxyMediaUrl(getMediaUrl(item))}
                  aria-hidden="true"
                />
                <Image
                  src={getMediaUrl(item)}
                  alt=""
                  fill
                  className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                  loading="lazy"
                  unoptimized={isProxyMediaUrl(getMediaUrl(item))}
                  onError={() =>
                    setFailedEvidence((current) => {
                      const next = new Set(current);
                      next.add(item);
                      return next;
                    })
                  }
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
                  <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white">
                    View full size
                  </span>
                </span>
              </button>
            ))}
          </div>

          <ImageLightbox
            images={visibleProofMedia.map((item, mediaIndex) => ({
              src: getMediaUrl(item),
              alt: `${cause.title} evidence ${mediaIndex + 1}`,
            }))}
            currentIndex={lightboxIndex}
            onIndexChange={setLightboxIndex}
            onClose={() => setLightboxIndex(null)}
            label={`${cause.title} campaign evidence`}
          />
        </div>
      )}
        </div>
      </details>
    </motion.div>
  );
}

function ImpactCard({ cause }: { cause: CauseDetail }) {
  const impactItems =
    cause.sections
      ?.map((section) => section.heading || section.description)
      .filter(Boolean) || [];
  const fallbackImpact = [
    ...(cause.location
      ? [`Direct support for the campaign in ${cause.location}`]
      : []),
    "Funds released against reviewed campaign milestones",
    "Progress and evidence shared with supporters",
  ];
  const bullets = [...impactItems, ...fallbackImpact]
    .filter((item, index, items) => items.indexOf(item) === index)
    .slice(0, 3);

  return (
    <motion.div
      className="rounded-[20px] border border-[#DDE3EA] bg-white p-6 text-sm text-[#53647A] sm:p-7"
      variants={fadeUp}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#235DA7]">
        Expected impact
      </div>
      <p className="mt-2 text-[21px] font-extrabold tracking-tight text-[#10233F]">
        Where your support goes
      </p>
      {bullets.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {bullets.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ECF5FF]">
                <CheckCircle2 className="h-4 w-4 text-[#235DA7]" />
              </span>
              <span className="pt-1.5 text-[14px] font-semibold text-[#33445A]">
                {item}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          No impact bullets yet. The campaign creator can add them in the story
          sections.
        </p>
      )}
    </motion.div>
  );
}

function StatsRow({
  cause,
  donorsCount,
}: {
  cause: CauseDetail;
  donorsCount: number;
}) {
  return (
    <motion.div className="grid gap-3 sm:grid-cols-3" variants={fadeUp}>
      <StatItem
        icon={<Target className="h-4 w-4" />}
        label="Raised"
        value={`₦${cause.raised.toLocaleString()} of ₦${cause.goal.toLocaleString()}`}
      />
      <StatItem
        icon={<Users className="h-4 w-4" />}
        label="Supporters"
        value={`${donorsCount}`}
      />
      <StatItem
        icon={<CalendarClock className="h-4 w-4" />}
        label="Days left"
        value={`${cause.days_active}`}
      />
    </motion.div>
  );
}

function PledgesCard({
  cause,
  profile,
}: {
  cause: CauseDetail;
  profile: ProfileSummary;
}) {
  const router = useRouter();

  return (
    <motion.div
      className="rounded-[28px] border border-[#DDE3EA] bg-white p-5 shadow-[0_24px_70px_-45px_rgba(16,35,63,0.45)] sm:p-6"
      variants={fadeUp}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#65758B]">
          Pledge
        </p>
        <HandHeart className="h-4 w-4 text-[#2563EB]" />
      </div>

      <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
        Pledge to donate later
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        Commit to a future donation. We&apos;ll remind you when it&apos;s time.
      </p>

      <Button
        onClick={() => router.push(`/causes/${cause.id}/pledge`)}
        className="mt-6 w-full rounded-full bg-[#0F172A] py-6 text-base font-semibold text-white shadow-lg hover:bg-[#1E293B]"
      >
        Make a Pledge
      </Button>
    </motion.div>
  );
}

function MediaCard({ media, cause }: { media: string[]; cause: CauseDetail }) {
  return (
    <motion.div
      className="overflow-hidden"
      variants={fadeUp}
    >
      {media.length > 0 || cause.image ? (
        <MultimediaCarousel
          media={media}
          coverImage={cause.image || undefined}
          title={cause.title}
        />
      ) : (
        <div className="flex h-64 items-center justify-center bg-slate-100 text-slate-400">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </motion.div>
  );
}

function ProgressCard({
  cause,
  percentRaised,
}: {
  cause: CauseDetail;
  percentRaised: number;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-[#DDE3EA] bg-white p-4 sm:rounded-[20px] sm:p-7"
      variants={fadeUp}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#235DA7]">
          Funding progress
        </p>
        <span className="rounded-full bg-[#E6F6D2] px-3 py-1.5 text-xs font-bold text-[#31551A]">
          {percentRaised}% funded
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1 sm:mt-5">
        <p className="text-[28px] font-extrabold tabular-nums tracking-tight text-[#10233F] sm:text-[32px]">
          ₦{cause.raised.toLocaleString()}
        </p>
        <p className="text-sm text-slate-500">
          raised of ₦{cause.goal.toLocaleString()}
        </p>
      </div>
      <Progress
        value={percentRaised}
        className="mt-4 h-2.5 bg-[#E8EDF2] sm:mt-5 [&>div]:bg-[#235DA7]"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-[#65758B]">
        <span>
          ₦{cause.raised.toLocaleString()} raised • {percentRaised}% funded
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECF5FF] px-3 py-1.5 font-bold text-[#235DA7]">
          <CalendarClock className="h-3.5 w-3.5" />
          {cause.days_active} days left
        </span>
      </div>
    </motion.div>
  );
}

function TabsCard({
  cause,
  formattedDate,
  comments,
  currentUserId,
  activeTab,
  setActiveTab,
}: {
  cause: CauseDetail;
  formattedDate: string;
  comments: Comment[];
  currentUserId?: string;
  activeTab: TabKey;
  setActiveTab: (value: TabKey) => void;
}) {
  const commentCount = comments.length;
  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white sm:rounded-[20px]"
      variants={fadeUp}
    >
      <div className="border-b border-[#E8EDF2] px-4 py-4 sm:hidden">
        <select
          className="w-full rounded-xl border border-[#DDE3EA] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#10233F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7]"
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as TabKey)}
        >
          {tabs.map((tab) => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden items-center gap-1 overflow-x-auto border-b border-[#E8EDF2] px-6 py-4 sm:flex">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7] ${
              activeTab === tab
                ? "bg-[#ECF5FF] text-[#235DA7]"
                : "text-[#53647A] hover:bg-[#F8FAFC] hover:text-[#10233F]"
            }`}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-7">
        {activeTab === "Updates" && (
          <div className="rounded-2xl border border-dashed border-[#CCD6E0] bg-[#F8FAFC] p-6 text-sm leading-6 text-[#53647A]">
            No updates yet. The organiser will post timeline updates here.
          </div>
        )}

        {activeTab === "Comments" && (
          <div className="rounded-2xl bg-[#F8FAFC] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MessagesSquare className="h-4 w-4 text-emerald-500" />
              {commentCount} comments
            </div>
            <div className="mt-4">
              <CommentsSection
                comments={comments}
                causeId={cause.id}
                currentUserId={currentUserId}
                entityType="cause"
              />
            </div>
          </div>
        )}

        {activeTab === "FAQ" && (
          <motion.div
            key="faq"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-[#0F172A]">
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {(cause.faqs && cause.faqs.length > 0
                ? cause.faqs
                : defaultFaqs
              ).map((faq, idx) => (
                <details
                  key={idx}
                  className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between font-medium text-[#0F172A]">
                    {faq.question}
                    <ChevronDown className="h-5 w-5 text-[#64748B]" />
                  </summary>
                  <p className="mt-2 text-sm text-[#64748B]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function DonateCard({
  cause,
  donation,
  setDonation,
  recurring,
  setRecurring,
  tip,
  setTip,
  serviceFee,
  totalWithTip,
  profile,
}: {
  cause: CauseDetail;
  donation: number;
  setDonation: (value: number) => void;
  recurring: "one_time" | "weekly" | "monthly";
  setRecurring: (value: "one_time" | "weekly" | "monthly") => void;
  tip: number;
  setTip: (value: number) => void;
  serviceFee: number;
  totalWithTip: number;
  profile: ProfileSummary;
}) {
  return (
    <motion.div
      className="overflow-hidden rounded-[20px] border border-[#DDE3EA] bg-white"
      variants={fadeUp}
    >
      <div className="bg-[#10233F] px-4 py-4 text-white sm:px-6 sm:py-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D9FF5B]">
            Support this campaign
          </p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 sm:h-9 sm:w-9">
            <HandHeart className="h-4 w-4 text-[#D9FF5B]" />
          </span>
        </div>
        <h3 className="mt-1.5 text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl">
          Make a donation
        </h3>
        <p className="mt-1.5 hidden text-xs leading-5 text-white/55 sm:block">
          Secure checkout · Publicly audited milestones
        </p>
      </div>

      <div className="space-y-3 p-4 sm:p-6 [&_label]:text-sm [&_label]:text-[#33445A] [&_input]:h-10 sm:[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-[#D8E0E8] [&_textarea]:rounded-xl [&_textarea]:border-[#D8E0E8]">
        <DonationForm
          causeId={cause.id}
          profile={profile}
          status={cause.status}
          subaccount={cause?.user.sub_account_code ?? undefined}
          causeName={cause.title}
          causeUrl={`/causes/${cause.id}`}
          recurring={recurring}
          tip={tip}
          initialAmount={donation}
          hideHeader
          hideAmountField
          hideCheckoutSummary
          flush
          compactOptionalFields
          submitLabel="Donate"
          submitClassName="h-11 rounded-xl bg-[#235DA7] text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(35,93,167,0.8)] hover:bg-[#1D4E8E] disabled:bg-[#AAB7C5] sm:h-12"
          beforeFields={
            <>
              <div className="grid grid-cols-2 gap-2">
                {donationPresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDonation(amount)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7] sm:py-2.5 ${
                      donation === amount
                        ? "border-[#2563EB] bg-[#ECF5FF] text-[#2563EB]"
                        : "border-[#D8E0E8] bg-white text-[#53647A] hover:border-[#8FA5BC]"
                    }`}
                  >
                    ₦{amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <label className="grid gap-2 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#65758B]">
                  Donation amount
                </span>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-[#CBD7E4] bg-white">
                  <span className="flex items-center justify-center bg-[#10233F] px-4 text-sm font-bold text-white">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    value={
                      donation ? donation.toLocaleString("en-US") : ""
                    }
                    onChange={(event) => {
                      const next = event.target.value.replace(/\D/g, "");
                      const capped = next.slice(0, 12);
                      setDonation(capped ? Number(capped) : 0);
                    }}
                    className="min-w-0 flex-1 appearance-none bg-transparent px-3 py-2 text-right text-lg font-bold tabular-nums text-[#10233F] outline-none"
                    placeholder="Enter amount"
                    aria-label="Donation amount"
                  />
                </div>
                <p className="hidden text-xs text-slate-500 sm:block">
                  This is the amount that goes toward the campaign.
                </p>
              </label>
            </>
          }
          optionalFieldsExtra={
            <div className="grid gap-5 border-t border-slate-200 pt-4">
              <label className="grid gap-2 text-sm text-[#53647A]">
                <span className="font-semibold text-[#33445A]">
                  Contribution schedule
                </span>
                <select
                  value={recurring}
                  onChange={(event) =>
                    setRecurring(
                      event.target.value as "one_time" | "weekly" | "monthly",
                    )
                  }
                  className="rounded-xl border border-[#D8E0E8] bg-white px-3 py-3 text-sm font-semibold text-[#33445A] outline-none focus-visible:ring-2 focus-visible:ring-[#235DA7]"
                >
                  <option value="one_time">One-time</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              <div className="grid gap-2 text-sm text-[#53647A]">
                <span className="font-semibold text-[#33445A]">
                  Optional platform tip
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {tipPresets.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTip(tip === value ? 0 : value)}
                      className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                        tip === value
                          ? "bg-[#10233F] text-white"
                          : "border border-[#D8E0E8] bg-white text-[#53647A]"
                      }`}
                    >
                      ₦{value.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-[#D8E0E8] bg-white">
                  <span className="flex items-center justify-center bg-[#10233F] px-3 text-sm font-semibold text-white">
                    ₦
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    value={tip ? tip.toLocaleString("en-US") : ""}
                    onChange={(event) => {
                      const digits = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 12);
                      setTip(digits ? Number(digits) : 0);
                    }}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-right text-sm font-semibold tabular-nums text-[#10233F] outline-none"
                    placeholder="Enter custom tip"
                    aria-label="Custom platform tip amount"
                  />
                </div>
              </div>
            </div>
          }
          afterFields={
            <div className="rounded-2xl bg-[#ECF5FF] p-3 sm:p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-[#10233F]">
                <span>Campaign receives</span>
                <span>₦{donation.toLocaleString()}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#C8D8E8] pt-3">
                <span className="text-sm font-bold text-[#10233F]">
                  Checkout total
                </span>
                <span className="text-lg font-bold text-[#235DA7]">
                  ₦{totalWithTip.toLocaleString()}
                </span>
              </div>
              {(serviceFee > 0 || tip > 0) && (
                <details className="group mt-3 border-t border-[#C8D8E8] pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-[#53647A]">
                    View breakdown
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 grid gap-1.5 text-xs text-[#65758B]">
                    <div className="flex justify-between">
                      <span>Service fee</span>
                      <span>₦{serviceFee.toLocaleString()}</span>
                    </div>
                    {tip > 0 && (
                      <div className="flex justify-between">
                        <span>Optional platform tip</span>
                        <span>₦{tip.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          }
        />

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-[#E1E7ED]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7B899A]">
            Or use crypto
          </span>
          <span className="h-px flex-1 bg-[#E1E7ED]" />
        </div>
        <BreetCryptoDonationModal
          causeId={cause.id}
          donorId={profile.id || null}
          triggerLabel="Donate with USDT"
          triggerClassName="h-11 w-full gap-x-2 rounded-xl border-[#CBD7E4] bg-white text-sm font-bold text-[#33445A] shadow-none hover:border-[#235DA7] hover:bg-[#ECF5FF] hover:text-[#235DA7] sm:h-12"
        />
        {/* <Link
          href={`/causes/${cause.id}/pledge`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]"
        >
          Pledge to donate later
        </Link> */}
      </div>

      <div className="mx-4 mb-4 flex items-start gap-2 border-t border-[#E8EDF2] pt-3 text-[11px] leading-4 text-[#65758B] sm:mx-6 sm:mb-5 sm:pt-4 sm:text-xs sm:leading-5">
        <ShieldAlert className="mt-0.5 h-4 w-4 text-[#F59E0B]" />
        Donations below ₦5 do not earn EIZA. Refunds or chargebacks remove
        rewards.
      </div>

      {!profile.id && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-xs text-[#64748B]">
          <span>Guest checkout</span>
          <span className="text-[#22C55E]">Enabled</span>
        </div>
      )}
    </motion.div>
  );
}

function CampaignHealthCard({
  donors,
  causeId,
  currentUserId,
  isFollowing,
}: {
  donors: Donor[];
  causeId: string;
  currentUserId?: string;
  isFollowing?: boolean;
}) {
  const recentDonors = useMemo(
    () =>
      donors.map((donor) => ({
      id: donor.id,
      name: donor.name || "Anonymous",
      amount: donor.amount || 0,
      })),
    [donors],
  );

  const [followed, setFollowed] = useState(isFollowing || false);
  const [followError, setFollowError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleFollow = () => {
    if (!currentUserId) {
      setShowLoginModal(true);
      return;
    }
    startTransition(async () => {
      setFollowError(null);
      const result = await followCampaign(causeId);
      if (result.error && result.error !== "unauthenticated") {
        setFollowError(result.error);
        setShowSupportModal(true);
      } else if (result.error === "unauthenticated") {
        setShowLoginModal(true);
      } else {
        setFollowed(true);
      }
    });
  };

  return (
    <motion.div
      className="rounded-[20px] border border-[#DDE3EA] bg-white p-6"
      variants={fadeUp}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Recent donors
        </p>
        <Share2 className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 grid gap-3 text-sm text-slate-600">
        {recentDonors.length > 0 ? (
          <>
            {recentDonors.slice(0, 3).map((donor) => (
              <div key={donor.id} className="flex items-center justify-between">
                <span className="truncate pr-2">{donor.name}</span>
                <span className="shrink-0 font-medium text-emerald-600">
                  ₦{Number(donor.amount).toLocaleString()}
                </span>
              </div>
            ))}

            {recentDonors.length > 3 && (
              <details className="group border-t border-slate-100 pt-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold text-[#235DA7]">
                  View all donors
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid gap-3">
                  {recentDonors.slice(3).map((donor) => (
                    <div
                      key={donor.id}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate pr-2">{donor.name}</span>
                      <span className="shrink-0 font-medium text-emerald-600">
                        ₦{Number(donor.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-500">Be the first to donate.</div>
        )}
      </div>

      {/* Follow campaign button */}
      {followed ? (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-[#C5E6A0] bg-[#EFF9E3] px-4 py-3 text-sm font-semibold text-[#31551A]">
          <CheckCheck className="h-4 w-4" />
          Following this campaign
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleFollow}
            disabled={isPending}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#235DA7] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:opacity-50"
          >
            <Bell className="h-3 w-3" />
            {isPending ? "Following..." : "Follow campaign"}
          </button>
        </>
      )}

      {/* Login modal for guests */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to follow</DialogTitle>
            <DialogDescription>
              Create a free account or sign in to follow this campaign and
              receive updates when milestones are reached.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              className="w-full rounded-full bg-[#0F172A] text-white hover:bg-[#1E293B]"
              onClick={() => {
                setShowLoginModal(false);
                window.location.href = `/login?redirect=/causes/${causeId}`;
              }}
            >
              Sign in
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                setShowLoginModal(false);
                window.location.href = `/register?redirect=/causes/${causeId}`;
              }}
            >
              Create account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
          <SupportErrorCta
            compact
            title="We couldn't follow this campaign"
            description="For customer support, follow us on X and join our Telegram community. Our team can help you there."
            errorMessage={followError}
            onRetry={() => {
              setShowSupportModal(false);
              handleFollow();
            }}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function StorySections({
  sections,
}: {
  sections: { heading: string; description: string }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const isLongStory =
    sections.length > 2 ||
    sections.reduce(
      (total, section) =>
        total + section.heading.length + section.description.length,
      0,
    ) > 650;
  const visible = expanded ? sections : sections.slice(0, 2);

  return (
    <div>
      <div
        className={`relative space-y-4 ${
          isLongStory && !expanded ? "max-h-[210px] overflow-hidden" : ""
        }`}
      >
        {visible.map((section, index) => (
          <div
            key={index}
            className="border-b border-[#E1E7ED] pb-5 last:border-0 last:pb-0"
          >
            <p className="text-base font-bold text-[#10233F]">
              {section.heading}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#53647A]">
              {section.description}
            </p>
          </div>
        ))}
        {isLongStory && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {isLongStory && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#235DA7] hover:text-[#2563EB]"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

function CollapsibleStoryText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLongStory = text.length > 650;

  return (
    <div>
      <div
        className={`relative ${
          isLongStory && !expanded ? "max-h-[210px] overflow-hidden" : ""
        }`}
      >
        <p className="whitespace-pre-line text-sm leading-7 text-[#53647A]">
          {text}
        </p>
        {isLongStory && !expanded && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/90 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      {isLongStory && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#235DA7] hover:text-[#2563EB]"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
}

export default function CampaignQualityLab({
  cause,
  donors,
  comments,
  profile,
  currentUserId,
}: CampaignQualityLabProps) {
  const [donation, setDonation] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>("Comments");
  const [recurring, setRecurring] = useState<"one_time" | "weekly" | "monthly">(
    "one_time",
  );
  const [tip, setTip] = useState(0);
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

  const formattedDate = useMemo(
    () =>
      new Date(cause.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [cause.created_at],
  );

  const serviceFee = useMemo(() => calculateServiceFee(donation), [donation]);
  const totalWithTip = useMemo(
    () => donation + tip + serviceFee,
    [donation, tip, serviceFee],
  );

  const media = useMemo(() => {
    return [...(cause.multimedia || []), ...(cause.video_links || [])];
  }, [cause.multimedia, cause.video_links]);

  const baseUrl = getBaseURL();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#10233F]">
      <main className="mx-auto grid max-w-[1280px] items-start gap-4 px-3 pb-24 pt-4 sm:gap-6 sm:px-6 sm:pb-28 sm:pt-6 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] lg:gap-8 lg:px-5">
        <motion.div
          className="order-1 lg:col-start-1 lg:row-start-1"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <HeroSummary
            cause={cause}
            donorsCount={donors.length}
          />
        </motion.div>

        <aside className="contents lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block lg:self-start">
          <div className="contents lg:sticky lg:top-24 lg:block">
            <div className="order-3" ref={donateRef}>
              <DonateCard
                cause={cause}
                donation={donation}
                setDonation={setDonation}
                recurring={recurring}
                setRecurring={setRecurring}
                tip={tip}
                setTip={setTip}
                serviceFee={serviceFee}
                totalWithTip={totalWithTip}
                profile={profile}
              />
            </div>
            <div className="order-5 lg:mt-6">
              <CampaignHealthCard
                donors={donors}
                causeId={cause.id}
                currentUserId={currentUserId}
                isFollowing={cause.isFollowing}
              />
            </div>
          </div>
        </aside>

        <div className="order-2 lg:col-start-1 lg:row-start-2">
          <section className="space-y-4 sm:space-y-6">
            <MediaCard media={media} cause={cause} />
            <ProgressCard cause={cause} percentRaised={percentRaised} />
          </section>
        </div>

        <div className="order-4 space-y-4 sm:space-y-6 lg:col-start-1 lg:row-start-3">
          <section className="space-y-4 sm:space-y-6">
            <motion.div
              className="rounded-2xl border border-[#DDE3EA] bg-white p-4 text-sm text-[#53647A] sm:rounded-[20px] sm:p-7"
              variants={fadeUp}
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
            <TrustPanel baseUrl={baseUrl} cause={cause} />
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
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#65758B]">Raised</p>
            <p className="truncate text-sm font-bold text-[#10233F]">₦{cause.raised.toLocaleString()}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              donateRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
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
