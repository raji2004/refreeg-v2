import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Keep this low in production — traces are billed per-event and most of
  // this app's request volume doesn't need full performance tracing.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Session Replay: capture almost nothing on happy-path sessions, but
  // always capture the full replay when an error actually occurs.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.replayIntegration()],
  debug: false,
});
