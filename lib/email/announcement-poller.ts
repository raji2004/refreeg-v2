export const POLL_MS = 60_000;

const POLLER_KEY = "__refreegAnnouncementPoller";

/**
 * Sends due announcements without an outside scheduler: once a minute the
 * server calls its own cron route, so scheduled announcements go out on a
 * plain `start` deploy. Set ANNOUNCEMENT_POLLER=off when something else (such
 * as EventBridge) already calls /api/cron/send-announcements.
 *
 * Safe on several instances: the sender claims each announcement with a
 * conditional update, so only one of them sends it.
 */
export function startAnnouncementPoller() {
  const scope = globalThis as unknown as Record<string, unknown>;
  // Dev reloads re-run register(); keep a single timer.
  if (scope[POLLER_KEY] || process.env.ANNOUNCEMENT_POLLER === "off") return;

  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    console.warn(
      "[announcements] CRON_SECRET is not set, so scheduled announcements will not send automatically",
    );
    return;
  }

  const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/cron/send-announcements`;
  let running = false;

  const tick = async () => {
    // A long send must not start a second one on top of itself.
    if (running) return;
    running = true;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: secret ? { authorization: `Bearer ${secret}` } : {},
      });
      if (!response.ok) {
        console.error(`[announcements] Poll failed with ${response.status}`);
      }
    } catch (error) {
      console.error("[announcements] Poll failed:", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, POLL_MS);
  timer.unref();
  scope[POLLER_KEY] = timer;
}
