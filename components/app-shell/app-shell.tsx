"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { getProfile } from "@/actions/profile-actions";
import { AppShellNav } from "./app-shell-nav";
import { AppShellHeader } from "./app-shell-header";
import { SidebarCtaCard } from "./sidebar-cta-card";

/**
 * Persistent sidebar + header shell for the app section of the site
 * (Discover, Petitions, Dashboard, Wallet, Bounties, Saved, Settings) —
 * used for both signed-in and signed-out visitors. See
 * components/client-layout.tsx for the route list that mounts this instead
 * of the marketing Header/Footer.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [isVerified, setIsVerified] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsVerified(false);
      setTotalPoints(0);
      return;
    }
    let cancelled = false;
    getProfile(user.id).then((profile) => {
      if (cancelled) return;
      setIsVerified(!!profile?.is_verified);
      setTotalPoints(profile?.total_points || 0);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink/10 bg-cream px-4 py-5 lg:flex">
        <Link href="/" className="mb-6 px-2">
          <Logo />
        </Link>
        <div className="flex-1 overflow-y-auto">
          <AppShellNav isAuthenticated={isAuthenticated} />
        </div>
        <div className="mt-4">
          <SidebarCtaCard isAuthenticated={isAuthenticated} isVerified={isVerified} />
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
        <SheetContent side="left" className="w-72 bg-cream p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Link href="/" className="mb-6 block px-2" onClick={() => setMobileNavOpen(false)}>
            <Logo />
          </Link>
          <div onClick={() => setMobileNavOpen(false)}>
            <AppShellNav isAuthenticated={isAuthenticated} />
          </div>
          <div className="mt-4">
            <SidebarCtaCard isAuthenticated={isAuthenticated} isVerified={isVerified} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
