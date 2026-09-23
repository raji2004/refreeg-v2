"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { interestOptions } from "@/lib/interest-categories";
import { cn } from "@/lib/utils";
import { SettingsSwitch } from "./components/settings-switch";

type Channel = "email" | "push" | "sms";

type NotificationRowId =
  | "campaign_updates"
  | "receipts"
  | "petition_milestones"
  | "bounty_invites"
  | "eiza_rewards"
  | "product_news";

type ChannelPrefs = Record<Channel, boolean>;

type NotificationPrefs = Record<NotificationRowId, ChannelPrefs> & {
  quietHours: boolean;
};

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "email", label: "Email" },
  { id: "push", label: "Push" },
  { id: "sms", label: "Sms" },
];

const DEFAULT_PREFS: NotificationPrefs = {
  campaign_updates: { email: true, push: true, sms: false },
  receipts: { email: true, push: true, sms: false },
  petition_milestones: { email: true, push: true, sms: false },
  bounty_invites: { email: true, push: true, sms: false },
  eiza_rewards: { email: false, push: true, sms: false },
  product_news: { email: false, push: false, sms: false },
  quietHours: true,
};

const STORAGE_KEY_PREFIX = "refreeg.notification-prefs.";

function interestLabel(id: string) {
  return interestOptions.find((o) => o.id === id)?.label ?? id;
}

function loadPrefs(userId: string | undefined): NotificationPrefs {
  if (typeof window === "undefined" || !userId) return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      campaign_updates: {
        ...DEFAULT_PREFS.campaign_updates,
        ...parsed.campaign_updates,
      },
      receipts: { ...DEFAULT_PREFS.receipts, ...parsed.receipts, email: true },
      petition_milestones: {
        ...DEFAULT_PREFS.petition_milestones,
        ...parsed.petition_milestones,
      },
      bounty_invites: {
        ...DEFAULT_PREFS.bounty_invites,
        ...parsed.bounty_invites,
      },
      eiza_rewards: { ...DEFAULT_PREFS.eiza_rewards, ...parsed.eiza_rewards },
      product_news: { ...DEFAULT_PREFS.product_news, ...parsed.product_news },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(userId: string | undefined, prefs: NotificationPrefs) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${userId}`,
    JSON.stringify(prefs),
  );
}

export function NotificationsForm() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs(user?.id));
    setHydrated(true);
  }, [user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    savePrefs(user?.id, prefs);
  }, [hydrated, prefs, user?.id]);

  const bountyMatchLine = useMemo(() => {
    const interests = profile?.interests ?? [];
    if (interests.length === 0) {
      return "Matched to skills you add on your profile";
    }
    return `Matched to ${interests.map(interestLabel).slice(0, 3).join(", ")}`;
  }, [profile?.interests]);

  const rows: {
    id: NotificationRowId;
    title: string;
    description: string;
    locked?: Partial<Record<Channel, boolean>>;
  }[] = [
    {
      id: "campaign_updates",
      title: "Campaign updates",
      description: "Progress and reports from campaigns you funded",
    },
    {
      id: "receipts",
      title: "Receipts and confirmations",
      description: "Always on for email — this is your record",
      locked: { email: true },
    },
    {
      id: "petition_milestones",
      title: "Petition milestones",
      description: "When a petition you signed hits a target or replies",
    },
    {
      id: "bounty_invites",
      title: "Bounty invites",
      description: bountyMatchLine,
    },
    {
      id: "eiza_rewards",
      title: "EIZA and rewards",
      description: "Earned, spent, and expiring balance",
    },
    {
      id: "product_news",
      title: "What's new on RefreeG",
      description: "Once a month, product and impact notes",
    },
  ];

  const setChannel = (
    rowId: NotificationRowId,
    channel: Channel,
    value: boolean,
  ) => {
    setPrefs((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [channel]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-fraunces text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Notifications
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink/55">
          Choose what reaches you, and where it lands
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl border-0 bg-cream-muted/80 shadow-none">
        <CardContent className="space-y-0 p-0">
          <div className="px-5 pb-2 pt-5 sm:px-6 sm:pt-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,4.5rem)] sm:items-end">
              <Eyebrow className="text-ink/45">What you get told about</Eyebrow>
              {CHANNELS.map((channel) => (
                <div key={channel.id} className="hidden text-center sm:block">
                  <Eyebrow className="text-ink/45">{channel.label}</Eyebrow>
                </div>
              ))}
            </div>
          </div>

          {rows.map((row, index) => (
            <div
              key={row.id}
              className={cn(
                "px-5 py-5 sm:px-6",
                index === 0 && "pt-4",
              )}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_repeat(3,4.5rem)] sm:items-center">
                <div className="min-w-0 pr-4">
                  <p className="text-[15px] font-semibold leading-6 text-ink">
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-ink/50">
                    {row.description}
                  </p>
                </div>

                {CHANNELS.map((channel) => {
                  const locked = Boolean(row.locked?.[channel.id]);
                  const checked = prefs[row.id][channel.id];
                  return (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between gap-3 sm:justify-center"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45 sm:hidden">
                        {channel.label}
                      </span>
                      <SettingsSwitch
                        checked={checked}
                        locked={locked}
                        aria-label={`${row.title} ${channel.label}`}
                        onCheckedChange={(value) => {
                          if (locked) return;
                          setChannel(row.id, channel.id, value);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-6 text-ink">
            Quiet hours
          </p>
          <p className="mt-0.5 text-sm leading-5 text-ink/50">
            Nothing pushes between 22:00 and 07:00. Receipts still arrive by
            email.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <div
            className={cn(
              "rounded-lg border border-hairline bg-white px-3 py-2 text-sm font-medium tabular-nums text-ink",
              !prefs.quietHours && "opacity-45",
            )}
          >
            22:00 – 07:00
          </div>
          <SettingsSwitch
            checked={prefs.quietHours}
            aria-label="Quiet hours"
            onCheckedChange={(value) =>
              setPrefs((prev) => ({ ...prev, quietHours: value }))
            }
          />
        </div>
      </div>
    </div>
  );
}
