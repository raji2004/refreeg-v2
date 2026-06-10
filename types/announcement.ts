export type AnnouncementStatus = "live" | "verified" | "settled" | "paused";

export interface AnnouncementItem {
  id: string;
  status: AnnouncementStatus;
  amount: number;
  currency: string;
  headline: string;
  reference?: string;
  href?: string;
}

export interface LiveAnnouncementRecord {
  id?: string;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
  campaignTitle?: string | null;
  causeTitle?: string | null;
  milestoneCurrent?: number | null;
  milestoneTotal?: number | null;
  txReference?: string | null;
  href?: string | null;
}
