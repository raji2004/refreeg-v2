"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotifications,
  markAllNotificationsRead,
  type NotificationItem,
} from "@/actions/notification-actions";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60)
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function Row({
  item,
  onNavigate,
}: {
  item: NotificationItem;
  onNavigate: () => void;
}) {
  const body = (
    <div
      className={cn(
        "flex gap-3 px-5 py-3.5",
        item.unread && "bg-bone",
        item.href && "transition-colors hover:bg-cream-muted",
      )}
    >
      <span
        className={cn(
          "mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full",
          item.unread ? "bg-blue-accent" : "bg-transparent",
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm leading-snug text-ink">
          {item.emphasis && (
            <span className="font-semibold">{item.emphasis}</span>
          )}
          {item.text}
        </p>
        <p className="mt-1 text-xs text-ink/50">{timeAgo(item.at)}</p>
      </div>
    </div>
  );
  return item.href ? (
    <Link href={item.href} onClick={onNavigate} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

const sectionLabel =
  "px-5 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55";

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    getNotifications()
      .then((result) => {
        if (!result) return;
        setItems(result.items);
        setUnreadCount(result.unreadCount);
      })
      .catch(() => {});
  }, []);

  // On mount for the dot, and again whenever the panel opens.
  useEffect(load, [load]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markAllRead = () => {
    setItems((prev) => prev?.map((i) => ({ ...i, unread: false })) ?? prev);
    setUnreadCount(0);
    markAllNotificationsRead().catch(load);
  };

  const unread = items?.filter((i) => i.unread) ?? [];
  const earlier = items?.filter((i) => !i.unread) ?? [];
  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-rust ring-2 ring-cream" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-hairline bg-surface p-0 shadow-[0_24px_60px_-24px_hsl(var(--ink)/0.35)]"
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <h2 className="font-semibold text-ink">Notifications</h2>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm font-semibold text-blue-accent hover:underline"
            >
              Mark all read
            </button>
          ) : items && items.length > 0 ? (
            <span className="text-sm text-ink/45">All read</span>
          ) : null}
        </div>

        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {items === null ? (
            <div className="space-y-3 px-5 py-5" aria-busy="true">
              <div className="h-4 w-4/5 rounded-full bg-cream-muted" />
              <div className="h-4 w-3/5 rounded-full bg-cream-muted" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink/55">
              You&apos;re all caught up.
            </p>
          ) : unread.length > 0 ? (
            <>
              <p className={sectionLabel}>New</p>
              {unread.map((item) => (
                <Row key={item.id} item={item} onNavigate={close} />
              ))}
              {earlier.length > 0 && (
                <>
                  <p className={sectionLabel}>Earlier</p>
                  {earlier.map((item) => (
                    <Row key={item.id} item={item} onNavigate={close} />
                  ))}
                </>
              )}
            </>
          ) : (
            <div className="pt-2">
              {items.map((item) => (
                <Row key={item.id} item={item} onNavigate={close} />
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-2">
          <Link
            href="/dashboard/settings/notifications"
            onClick={close}
            className="text-sm font-semibold text-blue-accent hover:underline"
          >
            Notification settings
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
