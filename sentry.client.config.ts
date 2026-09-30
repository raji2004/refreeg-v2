import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Keep this low in production — traces are billed per-event and most of
  // this app's request volume doesn't need full performance tracing.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Session Replay: capture almost nothing on happy-path sessions, but
  // always capture the full replay when an error actually occurs.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1,
  debug: false,
});

// Replay is ~100 KB; load it once the page is idle instead of on the critical path.
if (typeof window !== "undefined") {
  const loadReplay = () => {
    Sentry.lazyLoadIntegration("replayIntegration")
      .then((replayIntegration) => Sentry.addIntegration(replayIntegration()))
      .catch(() => {});
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(loadReplay, { timeout: 5000 });
  } else {
    setTimeout(loadReplay, 3000);
  }
}
