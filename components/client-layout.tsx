"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "@/components/header";
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

  const noLayoutRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/update-password",
    "/auth/reset-password",
    "/onboarding",
    "/docs/api",
    "/auth/verify-otp",
    "/dashboard/settings/kyc-setup",
    "/receipt",
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

  if (useAppShell) {
    return <AppShell>{children}</AppShell>;
  }

  return (
    <>
      {!hideLayout && <Header />}
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
      </div>
      {!hideLayout && <AIAgentBot />}
      {!hideLayout && <Footer />}
    </>
  );
}
