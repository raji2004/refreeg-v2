import type { Cause } from "@/types";
import type { Comment } from "@/types/common-types";

export type TabKey = "Comments" | "FAQ";

export type ProfileSummary = {
  email: string;
  name: string;
  id: string;
  subaccount: string;
};

export type Donor = {
  id: string;
  name?: string | null;
  amount?: number | null;
  created_at?: string | null;
};

export type CauseDetail = Cause & {
  user: {
    name: string;
    email: string;
    sub_account_code?: string | null;
    flutterwave_sub_account_id?: string | null;
    username: string;
    profile_photo?: string | null;
  };
  sections?: { heading: string; description: string }[];
  summary?: string | null;
  location?: string | null;
  verified_status?: string;
  trust_score?: { impact: string; readability: string; transparency: string };
  multimedia?: string[];
  video_links?: string[];
  faqs?: { question: string; answer: string }[];
  isFollowing?: boolean;
};

export type CampaignQualityLabProps = {
  cause: CauseDetail;
  donors: Donor[];
  comments: Comment[];
  profile: ProfileSummary;
  creatorHasWallet: boolean;
  currentUserId?: string;
  proofUpdates?: any[];
};

export const DONATION_PRESETS = [1000, 10000, 100000, 1000000];
export const TIP_PRESETS = [10, 100, 500];
export const TABS = ["Comments", "FAQ"] as const;

export const DEFAULT_FAQS = [
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

export const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const stagger: any = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
