"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import NavigationLoader from "@/components/NavigationLoader";
import AIAgentBot from "@/app/ai-agent/_components/ai-agent-bot";

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

  useEffect(() => {
    setIsRouteLoading(true);
    const timeout = setTimeout(() => {
      setIsRouteLoading(false);
    }, 700);

    return () => clearTimeout(timeout);
  }, [pathname]);

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
