"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import NavigationLoader from "@/components/NavigationLoader";
import AIAgentBot from "@/app/ai-agent/_components/ai-agent-bot";
import { AppShell } from "@/components/app-shell/app-shell";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  const noLayoutRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/update-password",
    "/auth/reset-password",
    "/onboarding",
    "/docs/api",
    "/auth/verify-otp",
    "/dashboard/settings/kyc-setup",
    "/dashboard/settings/kyc",
    "/dashboard/settings/",
  ];
  const hideLayout = noLayoutRoutes.some((route) => pathname.startsWith(route));

  // Persistent sidebar+header app shell (components/app-shell/app-shell.tsx),
  // for the "app" section of the site — Discover, Petitions, the dashboard
  // area, Wallet, Bounties, Saved — for both signed-in and signed-out
  // visitors. Everything else (marketing pages) keeps the existing
  // Header/Footer.
  const appShellRoutes = [
    "/dashboard",
    "/causes",
    "/petitions",
    "/wallet",
    "/bounties",
    "/saved",
  ];
  const useAppShell =
    !hideLayout && appShellRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    setIsRouteLoading(true);
    const timeout = setTimeout(() => {
      setIsRouteLoading(false);
    }, 700);

    return () => clearTimeout(timeout);
  }, [pathname]);

  if (useAppShell) {
    return (
      <AppShell>
        {isRouteLoading && <NavigationLoader />}
        {children}
        <AIAgentBot />
      </AppShell>
    );
  }

  return (
    <>
      {!hideLayout && <Header />}
      <div className="flex min-h-screen flex-col">
        {isRouteLoading && <NavigationLoader />}
        <main className="flex-1">{children}</main>
      </div>
      {!hideLayout && <AIAgentBot />}
      {!hideLayout && <Footer />}
    </>
  );
}
