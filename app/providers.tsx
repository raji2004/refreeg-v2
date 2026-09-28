"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { NotificationProvider } from "@/components/notification-provider";
import { AuthProvider } from "@/components/auth-provider";
import { GlobalSupportBoundary } from "@/components/global-support-boundary";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// A module-level client would be shared across requests during SSR, so the
// server gets a fresh one each render and only the browser reuses a singleton.
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  return (browserQueryClient ??= makeQueryClient());
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <GlobalSupportBoundary>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange
          >
            <NotificationProvider>
              <AuthProvider>{children}</AuthProvider>
            </NotificationProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </QueryClientProvider>
    </GlobalSupportBoundary>
  );
}
