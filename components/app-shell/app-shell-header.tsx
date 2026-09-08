"use client";

import Link from "next/link";
import { Bell, Coins, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { DiscoverSearch } from "@/components/discover/discover-search";

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
  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink/10 bg-cream px-4 py-3 sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/70 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <DiscoverSearch />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {isAuthenticated && (
          <span className="hidden items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1.5 text-sm font-semibold text-ink sm:flex">
            <Coins className="h-4 w-4" />
            {totalPoints.toLocaleString()}
          </span>
        )}

        <Link href="/causes">
          <Button size="sm" variant="lime" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Give
          </Button>
        </Link>

        {isAuthenticated ? (
          <>
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/15 bg-white text-ink/70 hover:bg-ink/5"
            >
              <Bell className="h-4 w-4" />
            </button>
            <UserNav />
          </>
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
