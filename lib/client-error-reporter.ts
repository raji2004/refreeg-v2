"use client";

type ClientErrorContext = {
  type: "window" | "unhandled-rejection" | "react";
  componentStack?: string | null;
};

const recentlyReported = new Map<string, number>();
const DEDUPE_WINDOW_MS = 10_000;

function details(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return {
    name: "Error",
    message: typeof error === "string" ? error : "An unexpected error occurred.",
    stack: undefined,
  };
}

export function reportClientError(error: unknown, context: ClientErrorContext) {
  if (typeof window === "undefined") return;

  const report = details(error);
  const path = window.location.pathname;
  const dedupeKey = `${report.name}:${report.message}:${path}`;
  const now = Date.now();
  if (now - (recentlyReported.get(dedupeKey) ?? 0) < DEDUPE_WINDOW_MS) return;
  recentlyReported.set(dedupeKey, now);

  const stack = [report.stack, context.componentStack].filter(Boolean).join("\n");
  void fetch("/api/error-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: context.type,
      name: report.name,
      message: report.message,
      path,
      stack,
    }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => {
    // Error reporting must never break the user-facing application.
  });
}
