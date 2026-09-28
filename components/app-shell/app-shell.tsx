"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { AppShellNav } from "./app-shell-nav";
import { AppShellHeader } from "./app-shell-header";
import { SidebarCtaCard } from "./sidebar-cta-card";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { profile } = useProfile(user?.id);
  const isVerified = !!profile?.is_verified;
  const totalPoints = profile?.total_points || 0;

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink/10 bg-white px-4 py-5 lg:flex">
        <Link href="/" className="mb-6 px-2">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <AppShellNav isAuthenticated={isAuthenticated} />
        </div>
        <div className="mt-4">
          <SidebarCtaCard
            isAuthenticated={isAuthenticated}
            isVerified={isVerified}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppShellHeader
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          totalPoints={totalPoints}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1">{children}</main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-white p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Link
            href="/"
            className="mb-6 block px-2"
            onClick={() => setMobileNavOpen(false)}
          >
            <Logo />
          </Link>
          <div onClick={() => setMobileNavOpen(false)}>
            <AppShellNav isAuthenticated={isAuthenticated} />
          </div>
          <div className="mt-4">
            <SidebarCtaCard
              isAuthenticated={isAuthenticated}
              isVerified={isVerified}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
