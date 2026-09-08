"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  HeartHandshake,
  Wallet,
  Flag,
  Trophy,
  Bookmark,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Discover and Petitions are browsable without an account; everything else needs one. */
  requiresAuth: boolean;
};

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { title: "Discover", href: "/causes", icon: Compass, requiresAuth: false },
  { title: "My giving", href: "/dashboard/donations", icon: HeartHandshake, requiresAuth: true },
  { title: "Wallet", href: "/wallet", icon: Wallet, requiresAuth: true },
  { title: "Petitions", href: "/petitions", icon: Flag, requiresAuth: false },
  { title: "Bounties", href: "/bounties", icon: Trophy, requiresAuth: true },
  { title: "Saved", href: "/saved", icon: Bookmark, requiresAuth: true },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, requiresAuth: true },
];

const isPathActive = (pathname: string, href: string) => {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AppShellNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = isPathActive(pathname, item.href);
        const locked = item.requiresAuth && !isAuthenticated;
        const href = locked
          ? `/auth/signin?redirect=${encodeURIComponent(item.href)}`
          : item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-ink text-ink-foreground"
                : "text-ink/70 hover:bg-ink/5",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
