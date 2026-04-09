"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Globe,
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
} from "lucide-react";
import type { Cause } from "@/types";
import dynamic from "next/dynamic";
import { Progress } from "@/components/ui/progress";
import { getBaseURL, calculateServiceFee } from "@/lib/utils";
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

const DonationForm = dynamic(
  () => import("@/components/donation-form").then((mod) => mod.DonationForm),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
  },
);

const SolanaDonationButtonWrapper = dynamic(
  () => import("@/components/crypto-details/SolanaDonationButtonWrapper"),
  {
    loading: () => <Skeleton className="h-10 w-full rounded-full" />,
    ssr: false,
  },
);

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

const tabs = ["Milestones", "Updates", "Budget", "Comments", "FAQ"] as const;
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

const trustStrip = [
  { label: "Escrowed", tone: "bg-emerald-50 text-emerald-700" },
  { label: "Verified Updates", tone: "bg-blue-50 text-blue-700" },
  { label: "Funds Audited", tone: "bg-amber-50 text-amber-700" },
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
    <div className="flex items-center gap-3 rounded-[14px] border border-[#E5E7EB] bg-white px-3 py-2 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
      <span className="text-[#64748B]">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">
          {label}
        </p>
        <p className="font-semibold text-[#0F172A]">{value}</p>
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
    <motion.div className="space-y-2" variants={fadeUp}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full">
        {/* LEFT: Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] sm:text-sm">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 sm:px-4 sm:py-2 font-semibold text-[#0F172A] shadow-sm">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{status === "approved" ? "Verified" : "In review"}</span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 sm:px-4 sm:py-2 font-medium text-[#0F172A] shadow-sm">
            <BadgeCheck className="h-4 w-4 sm:h-5 sm:w-5 text-[#2563EB]" />
            <span className="uppercase tracking-[0.2em] text-[10px] text-slate-400">
              Trust
            </span>
            <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs font-semibold text-white">
              {resolvedTrustScore}
            </span>
          </span>

          <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 sm:px-4 sm:py-2 font-medium text-[#0F172A] shadow-sm">
            <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 text-[#64748B]" />
            <span className="hidden sm:inline uppercase tracking-[0.2em] text-[10px] text-[#64748B]">
              Updated
            </span>
            <span className="text-xs sm:text-sm font-semibold text-[#0F172A]">
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
  return (
    <motion.div className="flex flex-col gap-4" variants={fadeUp}>
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-[#0F172A] sm:text-3xl lg:text-5xl">
        {cause.title}
      </h1>
      <p className="text-sm leading-relaxed text-[#64748B] sm:text-base lg:text-lg">
        {cause.summary ||
          "Verified, milestone-based relief with evidence-locked releases and transparent updates."}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm text-[#64748B] sm:gap-4 sm:text-sm">
        <span className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#2563EB]" />
          {cause.location || "Location on request"}
        </span>
        <span className="inline-flex items-center gap-2">
          <Users className="h-4 w-4 text-[#2563EB]" />
          {donorsCount} supporters
        </span>
        <span className="inline-flex items-center gap-2">
          <Globe className="h-4 w-4 text-[#2563EB]" />
          Worldwide donors welcome
        </span>
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
    if (cause.multimedia && cause.multimedia.length > 0)
      return cause.multimedia;
    if (cause.image) return [cause.image];
    return [];
  }, [cause.image, cause.multimedia]);

  const tiles = trustTiles(cause);

  return (
    <motion.div
      className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">
            Trust strip
          </p>
          <p className="mt-1 text-sm text-[#64748B]">
            Verified releases with evidence checkpoints.
          </p>
        </div>
        <ShareModal
          url={`${baseUrl}/causes/${cause.id}`}
          title={cause.title}
          entityId={cause.id}
          entityType="cause"
        />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-[#64748B] sm:grid-cols-2">
        {tiles.map((tile: any) => (
          <div
            key={tile.title}
            className="rounded-[14px] border border-[#E5E7EB] bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">
                {tile.title}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tile.badgeClass} ${tile.badgeTextClass}`}
              >
                {tile.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#64748B]">{tile.body}</p>
          </div>
        ))}
      </div>

      {proofMedia.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">
            Latest proof
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {proofMedia.slice(0, 3).map((item: any, index: any) => (
              <div
                key={`${item}-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <Image
                  src={item}
                  alt="Proof"
                  fill
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ImpactCard({ cause }: { cause: CauseDetail }) {
  const impactItems =
    cause.sections
      ?.map((section) => section.heading || section.description)
      .filter(Boolean) || [];
  const bullets = impactItems.slice(0, 3);

  return (
    <motion.div
      className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 text-sm text-[#64748B] shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">
        Impact in 3 bullets
      </p>
      {bullets.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {bullets.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
              <span>{item}</span>
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
    <motion.div
      className="grid gap-3 sm:gap-4 sm:grid-cols-3"
      variants={fadeUp}
    >
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
      className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
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
      className="overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      {media.length > 0 ? (
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
      className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Progress
        </p>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {percentRaised}% funded
        </span>
      </div>
      <div className="mt-4 flex items-end gap-3">
        <p className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          ₦{cause.raised.toLocaleString()}
        </p>
        <p className="text-sm text-slate-500">
          raised of ₦{cause.goal.toLocaleString()}
        </p>
      </div>
      <div className="mt-4">
        <Progress value={percentRaised} />
      </div>
      <div className="mt-3 text-sm text-slate-500">
        ₦{cause.raised.toLocaleString()} raised • {percentRaised}% funded •{" "}
        {cause.days_active} days left
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
      className="rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
        <select
          className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:hidden"
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

      <div className="hidden items-center gap-2 overflow-x-auto border-b border-slate-200 px-3 py-3 sm:flex sm:px-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:px-4 sm:py-2 sm:text-xs ${
              activeTab === tab
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6">
        {activeTab === "Milestones" && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Milestones are not yet configured for this campaign. Add milestone
            proof to unlock escrowed releases.
          </div>
        )}

        {activeTab === "Updates" && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No updates yet. The organiser will post timeline updates here.
          </div>
        )}

        {activeTab === "Budget" && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Budget breakdown will appear once provided by the organiser.
          </div>
        )}

        {activeTab === "Comments" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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
  impactText,
  profile,
  creatorHasWallet,
  donorsPreview,
  raisedToday,
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
  impactText: string;
  profile: ProfileSummary;
  creatorHasWallet: boolean;
  donorsPreview: { id: string; name: string; amount: number }[];
  raisedToday: number;
}) {
  return (
    <motion.div
      className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Donate
        </p>
        <HandHeart className="h-4 w-4 text-[#2563EB]" />
      </div>

      <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
        Make a contribution
      </h3>
      <p className="mt-2 text-sm text-slate-600">
        Rewards only apply to verified campaigns. Every milestone release is
        publicly audited.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {donationPresets.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => setDonation(amount)}
            className={`rounded-full border px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
              donation === amount
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : "border-[#E5E7EB] bg-white text-[#64748B]"
            }`}
          >
            ₦{amount.toLocaleString()}
          </button>
        ))}
      </div>

      <label className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
        <span className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Custom amount
        </span>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <span className="flex items-center justify-center bg-slate-900 px-3 text-sm font-semibold text-white">
            ₦
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={12}
            value={donation ? donation.toString() : ""}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "");
              const capped = next.slice(0, 12);
              setDonation(capped ? Number(capped) : 0);
            }}
            className="w-full appearance-none bg-transparent px-3 py-2 text-right text-sm text-slate-900 outline-none"
            placeholder="0"
          />
        </div>
        <p className="text-xs text-slate-500">Enter any amount above ₦1.</p>
      </label>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 text-sm text-[#64748B]">
          <span className="font-semibold text-slate-700">
            Contribution schedule
          </span>
          <select
            value={recurring}
            onChange={(event) =>
              setRecurring(
                event.target.value as "one_time" | "weekly" | "monthly",
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <option value="one_time">One-time</option>
            <option value="weekly">Every week</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label className="grid gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 text-sm text-[#64748B]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Platform tip</span>
            <span className="text-sm font-semibold text-slate-800">
              Support Refreeg ops
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tipPresets.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTip(tip === value ? 0 : value)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
                  tip === value
                    ? "bg-[#0F172A] text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]"
                    : "border border-[#E5E7EB] bg-white text-[#64748B]"
                }`}
              >
                ₦{value.toLocaleString()}
              </button>
            ))}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <span className="flex items-center justify-center bg-slate-900 px-3 text-sm font-semibold text-white">
                  ₦
                </span>
                <input
                  type="number"
                  min={0}
                  value={tip}
                  onChange={(event) => setTip(Number(event.target.value))}
                  className="w-full bg-transparent px-3 py-2 text-right text-sm font-semibold text-slate-900 outline-none"
                  placeholder="Custom"
                />
                {/* Hidden input to keep DonationForm logic intact */}
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={
                    typeof tip === "number" && donation > 0
                      ? Math.round((tip / donation) * 100)
                      : 0
                  }
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    setTip(Math.round(donation * (pct / 100)));
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </label>
      </div>

      <div className="mt-4 rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <p className="text-xs uppercase tracking-[0.15em] text-[#64748B]">
          Impact estimate
        </p>
        <p className="mt-2 text-sm text-[#0F172A]">{impactText}</p>
        {donation > 0 && (
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Donation amount</span>
              <span>₦{donation.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Service fee</span>
              <span>₦{serviceFee.toLocaleString()}</span>
            </div>
            {tip > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>Platform tip</span>
                <span>₦{tip.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-[#64748B]">
        <div className="flex items-center justify-between">
          <span>Total raised today</span>
          <span className="text-[#0F172A] font-medium">
            ₦{raisedToday.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="font-semibold text-slate-700">Checkout total</span>
          <span className="text-[#2563EB] font-bold">
            ₦{totalWithTip.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-700">
          Recent donors
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {donorsPreview.length > 0 ? (
            donorsPreview.slice(0, 3).map((donor) => (
              <span
                key={donor.id}
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-slate-700"
              >
                {donor.name}
                <span className="text-emerald-600">
                  ₦{donor.amount.toLocaleString()}
                </span>
              </span>
            ))
          ) : (
            <span className="font-semibold text-slate-700">
              Be the first to donate.
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {creatorHasWallet && <SolanaDonationButtonWrapper causeId={cause.id} />}
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
        />
        {/* <Link
          href={`/causes/${cause.id}/pledge`}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#2563EB] px-4 py-3 text-base font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)] transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]"
        >
          Pledge to donate later
        </Link> */}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-[#64748B]">
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
  donorsPreview,
  causeId,
  currentUserId,
  isFollowing,
}: {
  donorsPreview: { id: string; name: string; amount: number }[];
  causeId: string;
  currentUserId?: string;
  isFollowing?: boolean;
}) {
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
      className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Campaign health
        </p>
        <Target className="h-4 w-4 text-rose-500" />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Auto prompts trigger when momentum dips or the goal nears completion.
      </p>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
          Recent donors
        </p>
        <Share2 className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 grid gap-3 text-sm text-slate-600">
        {donorsPreview.length > 0 ? (
          donorsPreview.map((donor) => (
            <div key={donor.id} className="flex items-center justify-between">
              <span>{donor.name}</span>
              <span className="text-emerald-600">
                ₦{Number(donor.amount).toLocaleString()}
              </span>
            </div>
          ))
        ) : (
          <div className="text-sm text-slate-500">Be the first to donate.</div>
        )}
      </div>

      {/* Follow campaign button */}
      {followed ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          <CheckCheck className="h-4 w-4" />
          Following this campaign
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleFollow}
            disabled={isPending}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.15em] text-slate-600 transition hover:border-slate-400 disabled:opacity-50 flex items-center justify-center gap-2"
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
  const visible = expanded ? sections : sections.slice(0, 2);

  return (
    <div className="space-y-4">
      {visible.map((section, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <p className="text-sm font-semibold text-slate-900">
            {section.heading}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
            {section.description}
          </p>
        </div>
      ))}
      {sections.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-sm font-semibold text-slate-700 underline underline-offset-4"
        >
          {expanded ? "Show less" : "Read full story"}
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
  creatorHasWallet,
  currentUserId,
}: CampaignQualityLabProps) {
  const [donation, setDonation] = useState(25);
  const [activeTab, setActiveTab] = useState<TabKey>("Comments");
  const [recurring, setRecurring] = useState<"one_time" | "weekly" | "monthly">(
    "one_time",
  );
  const [tip, setTip] = useState(5);
  const donateRef = useRef<HTMLDivElement | null>(null);

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

  const impactText = useMemo(() => {
    return (
      cause.summary ||
      "Impact details will appear once provided by the campaign creator."
    );
  }, [cause.summary]);

  const serviceFee = useMemo(() => calculateServiceFee(donation), [donation]);
  const totalWithTip = useMemo(
    () => donation + tip + serviceFee,
    [donation, tip, serviceFee],
  );

  const raisedToday = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return donors.reduce((sum, donor) => {
      if (!donor.created_at) return sum;
      const donorDate = new Date(donor.created_at).toISOString().split("T")[0];
      return donorDate === today ? sum + (donor.amount || 0) : sum;
    }, 0);
  }, [donors]);

  const donorsPreview = useMemo(
    () =>
      donors.slice(0, 5).map((donor) => ({
        id: donor.id,
        name: donor.name || "Anonymous",
        amount: donor.amount || 0,
      })),
    [donors],
  );

  const media = useMemo(() => {
    const items = [...(cause.multimedia || []), ...(cause.video_links || [])];
    if (items.length > 0) return items;
    if (cause.image) return [cause.image];
    return [];
  }, [cause.image, cause.multimedia, cause.video_links]);

  const baseUrl = getBaseURL();

  return (
    <div
      className="min-h-screen bg-[#F6F8FB] pt-0 text-[#0F172A]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 20%, rgba(37,99,235,0.08), transparent 60%)",
      }}
    >
      <div className="border-b border-[#E5E7EB] bg-white">
        <div className="container px-4 pb-4 pt-0 sm:pb-6 sm:pt-0">
          <motion.div
            className="flex flex-col gap-5 sm:gap-6"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <HeaderMeta
              status={cause.status}
              formattedDate={formattedDate}
              trustScore={cause.trust_score?.impact}
              cause={cause}
              profile={profile}
            />

            <motion.div className="grid gap-6" variants={stagger}>
              <HeroSummary cause={cause} donorsCount={donors.length} />
            </motion.div>

            <motion.div className="flex flex-wrap gap-2" variants={fadeUp}>
              {trustStrip.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}
                >
                  {item.label}
                </span>
              ))}
            </motion.div>

            <StatsRow cause={cause} donorsCount={donors.length} />
          </motion.div>
        </div>
      </div>

      <main className="container grid items-start gap-6 px-4 pb-24 pt-6 sm:py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="order-2 self-start space-y-6 lg:order-2 lg:col-start-2 lg:row-span-2 lg:self-start">
          <div className="space-y-6 lg:sticky lg:top-24">
            <div ref={donateRef}>
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
                impactText={impactText}
                profile={profile}
                creatorHasWallet={creatorHasWallet}
                donorsPreview={donorsPreview}
                raisedToday={raisedToday}
              />
            </div>
            {/* <PledgesCard cause={cause} profile={profile} /> */}
            <CampaignHealthCard
              donorsPreview={donorsPreview}
              causeId={cause.id}
              currentUserId={currentUserId}
              isFollowing={cause.isFollowing}
            />
          </div>
        </aside>

        <section className="order-1 space-y-6 lg:order-1 lg:col-start-1 lg:col-end-2">
          <MediaCard media={media} cause={cause} />
          <ProgressCard cause={cause} percentRaised={percentRaised} />
          <motion.div
            className="rounded-[14px] border border-[#E5E7EB] bg-white p-4 text-sm text-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:p-6"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            <p className="text-xs uppercase tracking-[0.15em] text-slate-500">
              Story
            </p>
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Created by</span>
                <span className="font-medium text-slate-800">
                  {cause.user.name}
                </span>
                <span className="text-slate-300">•</span>
                <span className="capitalize">{cause.category}</span>
                <span className="text-slate-300">•</span>
                <span>{formattedDate}</span>
              </div>
              {cause.sections && cause.sections.length > 0 ? (
                <StorySections sections={cause.sections} />
              ) : cause.description ? (
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {cause.description}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  No story yet. The campaign creator can add the full context
                  and plan here.
                </p>
              )}
            </div>
          </motion.div>
          <ImpactCard cause={cause} />
          <TrustPanel baseUrl={baseUrl} cause={cause} />
        </section>

        <section className="order-3 lg:col-start-1 lg:col-end-2">
          <TabsCard
            cause={cause}
            formattedDate={formattedDate}
            comments={comments}
            currentUserId={currentUserId}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] sm:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => {
              donateRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            Donate
          </button>
        </div>
      </div>
    </div>
  );
}
