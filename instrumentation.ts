import type { Instrumentation } from "next";
import {
  errorDetails,
  reportToRefreegAlert,
} from "@/lib/refreeg-alert-reporter";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const details = errorDetails(error);
  await reportToRefreegAlert({
    source: "server",
    name: details.name,
    message: details.message,
    stack: details.stack,
    path: `${request.method} ${request.path.split("?")[0]} (${context.routeType})`,
    severity: "CRITICAL",
  });

  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
