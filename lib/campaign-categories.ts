import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  FolderHeart,
  GraduationCap,
  HeartPulse,
  Leaf,
  LifeBuoy,
  Palette,
  PawPrint,
  Users,
} from "lucide-react";

export type CampaignCategoryStyle = {
  id: string;
  name: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
  badgeClassName: string;
};

export const campaignCategoryStyles: CampaignCategoryStyle[] = [
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    iconClassName: "text-blue-700",
    iconBackgroundClassName: "bg-blue-100",
    badgeClassName: "border-blue-200 bg-blue-100 text-blue-800",
  },
  {
    id: "health",
    name: "Healthcare",
    icon: HeartPulse,
    iconClassName: "text-rose-700",
    iconBackgroundClassName: "bg-rose-100",
    badgeClassName: "border-rose-200 bg-rose-100 text-rose-800",
  },
  {
    id: "environment",
    name: "Environment",
    icon: Leaf,
    iconClassName: "text-emerald-700",
    iconBackgroundClassName: "bg-emerald-100",
    badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
  {
    id: "community",
    name: "Community",
    icon: Users,
    iconClassName: "text-violet-700",
    iconBackgroundClassName: "bg-violet-100",
    badgeClassName: "border-violet-200 bg-violet-100 text-violet-800",
  },
  {
    id: "disaster",
    name: "Disaster Relief",
    icon: LifeBuoy,
    iconClassName: "text-orange-700",
    iconBackgroundClassName: "bg-orange-100",
    badgeClassName: "border-orange-200 bg-orange-100 text-orange-800",
  },
  {
    id: "animals",
    name: "Animal Welfare",
    icon: PawPrint,
    iconClassName: "text-amber-700",
    iconBackgroundClassName: "bg-amber-100",
    badgeClassName: "border-amber-200 bg-amber-100 text-amber-800",
  },
  {
    id: "creative",
    name: "Creative",
    icon: Palette,
    iconClassName: "text-pink-700",
    iconBackgroundClassName: "bg-pink-100",
    badgeClassName: "border-pink-200 bg-pink-100 text-pink-800",
  },
  {
    id: "business",
    name: "Business",
    icon: BriefcaseBusiness,
    iconClassName: "text-emerald-700",
    iconBackgroundClassName: "bg-emerald-100",
    badgeClassName: "border-emerald-200 bg-emerald-100 text-emerald-800",
  },
];

const fallbackCategoryStyle: CampaignCategoryStyle = {
  id: "general",
  name: "General",
  icon: FolderHeart,
  iconClassName: "text-slate-700",
  iconBackgroundClassName: "bg-slate-100",
  badgeClassName: "border-slate-200 bg-slate-100 text-slate-800",
};

export function getCampaignCategoryStyle(value?: string | null) {
  const normalizedValue = value?.trim().toLowerCase();

  return (
    campaignCategoryStyles.find(
      (category) =>
        category.id === normalizedValue ||
        category.name.toLowerCase() === normalizedValue,
    ) ?? fallbackCategoryStyle
  );
}
