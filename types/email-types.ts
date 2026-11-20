export type EmailTriggerItem = {
  key: string;
  label: string;
  audience: string;
  required: boolean;
  enabled: boolean;
};

export type AnnouncementStatus = "scheduled" | "sending" | "sent" | "failed";

export type AnnouncementItem = {
  id: string;
  title: string;
  audience: string;
  status: AnnouncementStatus;
  scheduledAt: string;
  completedAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
};
