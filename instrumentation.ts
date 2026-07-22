import type { Instrumentation } from "next";
import {
  errorDetails,
  reportToRefreegAlert,
} from "@/lib/refreeg-alert-reporter";

export async function register() {}

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
};
