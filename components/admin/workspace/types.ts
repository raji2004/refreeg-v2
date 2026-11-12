export type WorkspaceView = "analytics" | "ambassadors" | "users" | "eiza";
export type Period = "day" | "month" | "year";
export type Tone = "green" | "red" | "gold" | "blue" | "neutral";
export type Metric = {
  label: string;
  value: string;
  change?: string;
  tone?: Tone;
};
export type WorkItem = {
  id: string;
  name: string;
  detail: string;
  initials: string;
  status: string;
  avatar?: Tone;
  href?: string;
};
export type Segment = { label: string; value: number; display: string };
export type Series = { values: number[]; previous: number[]; labels: string[] };

export type TopCampaign = {
  item: WorkItem;
  given: string;
  donors: number;
  averageGift: string;
  trend: number[];
};

export type Ambassador = {
  id: string;
  name: string;
  initials: string;
  region: string;
  referrals: number;
  signupRate: string;
  donations: string;
  donationsValue: number;
  rewards: string;
  trend: number[];
};

export type NavCounts = Partial<
  Record<"Campaigns" | "KYC" | "Petitions & bounties", number>
>;

export type WorkspaceData = {
  period: Period;
  generatedAt: string;
  label: string;
  previousLabel: string;
  metrics: Metric[];
  donations: Series;
  topCampaigns: TopCampaign[];
  campaignStatus: { segments: Segment[]; total: string };
  eiza: { segments: Segment[]; total: string };
  ambassadors: Ambassador[];
  users: {
    monthlyActive: string;
    change: string;
    retention: string;
    trend: number[];
  };
  yearSummary: [string, string][];
  userActivity: { returning: number[]; new: number[]; labels: string[] };
  cohorts: { label: string; values: (number | null)[] }[];
  holders: {
    rows: { label: string; value: number; tone: Tone }[];
    top100Share: number;
  };
  navCounts: NavCounts;
};
