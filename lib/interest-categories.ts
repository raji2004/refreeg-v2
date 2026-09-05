import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Droplets,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Leaf,
  LifeBuoy,
  ScrollText,
  Wrench,
} from "lucide-react";

/**
 * Onboarding interest tiles. Wider than lib/campaign-categories.ts's 8
 * campaign categories on purpose — some tiles (accountability, skills &
 * bounties) don't correspond to any real cause category yet. Only tiles
 * with a `campaignCategoryId` get a live count and feed the dashboard's
 * matched-campaigns row; the rest are collected for future use.
 */
export type InterestOption = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Maps to lib/campaign-categories.ts's CampaignCategoryStyle.id, when one exists. */
  campaignCategoryId?: string;
};

export const interestOptions: InterestOption[] = [
  { id: "education", label: "Education", icon: GraduationCap, campaignCategoryId: "education" },
  { id: "health", label: "Health", icon: HeartPulse, campaignCategoryId: "health" },
  { id: "disaster-relief", label: "Disaster relief", icon: LifeBuoy, campaignCategoryId: "disaster" },
  { id: "water", label: "Water", icon: Droplets },
  { id: "small-business", label: "Small business", icon: BriefcaseBusiness, campaignCategoryId: "business" },
  { id: "women-girls", label: "Women & girls", icon: HeartHandshake },
  { id: "accountability", label: "Accountability", icon: ScrollText },
  { id: "climate", label: "Climate", icon: Leaf, campaignCategoryId: "environment" },
  { id: "skills-bounties", label: "Skills & bounties", icon: Wrench },
];

export const MIN_INTERESTS_REQUIRED = 3;
