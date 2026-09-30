"use client";

import React from "react";
import { SupportErrorCta } from "@/components/support-error-cta";
import { reportClientError } from "@/lib/client-error-reporter";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred.";
}

// A deploy prunes the previous release's directory (see
// scripts/remote-deploy.sh) — anyone with a tab already open when that
// happens gets a 404 the next time it fetches a JS chunk (a route
// transition, a next/dynamic import) referencing the old build's hash.
// That's not a real app error, just a stale page — reloading once fetches
// the current HTML/chunk manifest and fixes it silently. The sessionStorage
// guard stops a reload loop if the fetch keeps failing for some other
// reason (e.g. actually offline).
const CHUNK_RELOAD_KEY = "refreeg:chunk-reload-attempted";

function isChunkLoadError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    (error instanceof Error && error.name === "ChunkLoadError") ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

function reloadOnceForStaleChunk(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode, etc.) — fall through to
    // the normal error screen rather than risk reloading forever.
    return false;
  }
  window.location.reload();
  return true;
}

export class GlobalSupportBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: getErrorMessage(error),
    };
  }

  private handleWindowError = (event: ErrorEvent) => {
    if (reloadOnceForStaleChunk(event.error || event.message)) return;
    const message = getErrorMessage(event.error || event.message);
    reportClientError(event.error || event.message, { type: "window" });
    console.error(`[Window Error] ${message}`, {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      error: event.error
    });
    this.setState({
      hasError: true,
      errorMessage: message,
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (reloadOnceForStaleChunk(event.reason)) return;
    const message = getErrorMessage(event.reason);
    reportClientError(event.reason, { type: "unhandled-rejection" });
    console.error(`[Unhandled Rejection] ${message}`, {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      reason: event.reason
    });
    this.setState({
      hasError: true,
      errorMessage: message,
    });
  };

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    if (reloadOnceForStaleChunk(error)) return;
    reportClientError(error, {
      type: "react",
      componentStack: errorInfo.componentStack,
    });
    console.error(`[React Error] ${getErrorMessage(error)}`, {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack,
      error
    });
  }

  componentDidMount() {
    // A healthy mount means the reload (if one just happened) worked —
    // clear the guard so a later deploy this same session can also
    // trigger one, instead of the flag blocking it for the rest of the tab's
    // lifetime.
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      // ignore — same best-effort as the guard's own sessionStorage use
    }
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection,
    );
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
          <SupportErrorCta
            title="We hit an error loading this page"
            description="Please follow us on X and join our Telegram community for customer support while we sort this out."
            errorMessage={this.state.errorMessage}
            onRetry={() => {
              window.location.href = "/";
            }}
            retryLabel="Go home"
          />
        </main>
      );
    }

    return this.props.children;
  }
}
