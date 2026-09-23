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
  requiresAuth: boolean;
  badge?: string;
  count?: number | string;
};

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { title: "Discover", href: "/causes", icon: Compass, requiresAuth: false },
  { title: "My giving", href: "/dashboard/donations", icon: HeartHandshake, requiresAuth: true },
  { title: "Wallet", href: "/wallet", icon: Wallet, requiresAuth: true },
  { title: "Petitions", href: "/petitions", icon: Flag, requiresAuth: false },
  { title: "Bounties", href: "/bounties", icon: Trophy, requiresAuth: true, badge: "41" },
];

const isPathActive = (pathname: string, href: string) => {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AppShellNav({
  isAuthenticated,
  savedCount,
}: {
  isAuthenticated: boolean;
  savedCount?: number;
}) {
  const pathname = usePathname();

  const secondaryNavItems: NavItem[] = [
    {
      title: "Saved",
      href: "/saved",
      icon: Bookmark,
      requiresAuth: true,
      count: isAuthenticated && savedCount !== undefined ? savedCount : undefined,
    },
    { title: "Settings", href: "/dashboard/settings/profile", icon: Settings, requiresAuth: true },
  ];

  const renderItem = (item: NavItem) => {
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
          "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
          active
            ? "bg-[#ede9df] font-semibold text-ink"
            : "font-medium text-ink/75 hover:bg-ink/5 hover:text-ink",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", active ? "text-ink" : "text-ink/70")} />
        <span className="flex-1 truncate">{item.title}</span>
        {item.badge ? (
          <span className="rounded-full bg-[#fde8e4] px-2 py-0.5 text-[11px] font-semibold text-[#c8401c]">
            {item.badge}
          </span>
        ) : null}
        {item.count !== undefined ? (
          <span className="text-xs font-medium text-ink/50">{item.count}</span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav className="flex flex-col">
      <div className="flex flex-col gap-1">{mainNavItems.map(renderItem)}</div>
      <div className="my-3 border-t border-ink/5" />
      <div className="flex flex-col gap-1">{secondaryNavItems.map(renderItem)}</div>
    </nav>
  );
}
