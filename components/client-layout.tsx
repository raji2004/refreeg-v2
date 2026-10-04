"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
import NavigationLoader from "@/components/NavigationLoader";
import { AppShell } from "@/components/app-shell/app-shell";

const AIAgentBot = dynamic(
  () => import("@/app/ai-agent/_components/ai-agent-bot"),
  {
    ssr: false,
    loading: () => null,
  },
);

const Footer = dynamic(
  () => import("@/components/footer").then((mod) => mod.Footer),
  {
    ssr: true,
  },
);

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
  ];
  const hideLayout = noLayoutRoutes.some((route) => pathname.startsWith(route));

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
