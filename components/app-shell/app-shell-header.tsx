"use client";

import Link from "next/link";
import { Coins, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { DiscoverSearch } from "@/components/discover/discover-search";
import { GivingSearch } from "@/components/giving/giving-search";
import { NotificationsMenu } from "./notifications-menu";

export function AppShellHeader({
  isAuthenticated,
  isLoading,
  totalPoints,
  onOpenMobileNav,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  totalPoints: number;
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between gap-4 bg-cream px-4 py-3 sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/70 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        {pathname.startsWith("/dashboard/donations") ? (
          <Suspense fallback={null}>
            <GivingSearch />
          </Suspense>
        ) : (
          <DiscoverSearch />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* EIZA Coins Pill (commented out per user request)
        {isAuthenticated && (
          <span className="hidden items-center gap-1.5 rounded-full bg-[#fdf3d9] border border-amber/30 px-3 py-1.5 text-sm font-semibold text-ink sm:flex">
            <Coins className="h-4 w-4 text-amber" />
            {totalPoints.toLocaleString()}
          </span>
        )}
        */}

        {isAuthenticated && <NotificationsMenu />}

        <Link href="/causes">
          <Button
            size="sm"
            variant="ink"
            className="gap-1.5 rounded-xl px-4 py-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            Give
          </Button>
        </Link>

        {isAuthenticated ? (
          <UserNav />
        ) : !isLoading ? (
          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/auth/signin">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" variant="ink">
                Sign Up
              </Button>
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
