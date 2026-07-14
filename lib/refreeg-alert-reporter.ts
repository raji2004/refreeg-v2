type ErrorSource = "browser" | "server";

export type RefreegErrorReport = {
  source: ErrorSource;
  name?: string;
  message: string;
  path?: string;
  stack?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
};

function clip(value: string | undefined, limit: number) {
  return value?.trim().slice(0, limit);
}

async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function errorDetails(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return {
    name: "Error",
    message: typeof error === "string" ? error : "An unexpected error occurred.",
    stack: undefined,
  };
}

export async function reportToRefreegAlert(report: RefreegErrorReport) {
  const endpoint = process.env.REFREEG_ALERT_URL?.trim().replace(/\/+$/, "");
  const apiKey = process.env.REFREEG_REPORTER_KEY?.trim();
  if (!endpoint || !apiKey) return false;

  const name = clip(report.name, 80) || "Error";
  const message = clip(report.message, 1_000) || "An unexpected error occurred.";
  const path = clip(report.path, 500);
  const stack = clip(report.stack, 1_000);
  const key = `${report.source}:${name}:${message.slice(0, 160)}:${path ?? "unknown"}`;
  const errorMessage = [message, path && `Path: ${path}`, stack]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2_000);

  try {
    const response = await fetch(`${endpoint}/api/errors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-reporter-key": apiKey,
      },
      body: JSON.stringify({
        fingerprint: await fingerprint(key),
        title: `${report.source === "browser" ? "Browser" : "Server"} ${name}: ${message}`.slice(0, 200),
        errorMessage,
        severity: report.severity ?? "HIGH",
        serviceName: "RefreeG Website",
      }),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    console.error("Unable to forward error to RefreeG Alert", error);
    return false;
  }
}
