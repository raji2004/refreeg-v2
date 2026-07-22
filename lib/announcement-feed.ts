import { AnnouncementItem, AnnouncementStatus, LiveAnnouncementRecord } from "@/types/announcement";

export const ANNOUNCEMENT_PLACEHOLDER_ITEMS: AnnouncementItem[] = [
  {
    id: "placeholder-1",
    status: "live",
    amount: 1200,
    currency: "NGN",
    headline: "Tigray Famine Relief",
    reference: "0xd92e...4f1a",
    href: "/causes",
  },
  {
    id: "placeholder-2",
    status: "verified",
    amount: 0,
    currency: "NGN",
    headline: "Milestone 2/4 complete · Clean Water Borno",
    reference: "0x8c4f...a1b9",
    href: "/causes",
  },
  {
    id: "placeholder-3",
    status: "settled",
    amount: 75.5,
    currency: "NGN",
    headline: "Cebu Storm Recovery",
    reference: "1.8s",
    href: "/causes",
  },
  {
    id: "placeholder-4",
    status: "live",
    amount: 430,
    currency: "NGN",
    headline: "North Gaza Emergency Kits",
    reference: "0x91dd...ce20",
    href: "/causes",
  },
];

const statusMap: Record<string, AnnouncementStatus> = {
  live: "live",
  active: "live",
  verified: "verified",
  settled: "settled",
  complete: "settled",
  paused: "paused",
  hold: "paused",
};

function normalizeStatus(status?: string | null): AnnouncementStatus {
  if (!status) {
    return "live";
  }

  const key = status.trim().toLowerCase();
  return statusMap[key] ?? "live";
}

function buildHeadline(record: LiveAnnouncementRecord): string {
  const base = record.campaignTitle || record.causeTitle || "Campaign Update";

  if (typeof record.milestoneCurrent === "number" && typeof record.milestoneTotal === "number") {
    return `Milestone ${record.milestoneCurrent}/${record.milestoneTotal} complete · ${base}`;
  }

  return base;
}

export function mapLiveRecordsToAnnouncementItems(records: LiveAnnouncementRecord[]): AnnouncementItem[] {
  return records.map((record, index) => ({
    id: record.id || `live-${index}`,
    status: normalizeStatus(record.status),
    amount: Number(record.amount ?? 0),
    currency: "NGN",
    headline: buildHeadline(record),
    reference: record.txReference || undefined,
    href: record.href || "/causes",
  }));
}
