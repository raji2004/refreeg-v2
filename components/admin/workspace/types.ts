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
  type: string;
  owner?: string;
  waiting: string;
  status: string;
  tone: Tone;
  avatar?: Tone;
  href?: string;
};
