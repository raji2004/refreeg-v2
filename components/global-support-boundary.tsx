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
