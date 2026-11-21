"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Contact,
  Database,
  Flag,
  LayoutGrid,
  Megaphone,
  Receipt,
  ScrollText,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useAdminShellSummary } from "@/hooks/use-admin-shell";
import { cn } from "@/lib/utils";

type CountKey = "campaigns" | "kyc" | "receipts" | "petitions";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  countKey?: CountKey;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Insights",
    items: [
      {
        title: "Overview",
        href: "/dashboard/admin/analytics",
        icon: LayoutGrid,
      },
      {
        title: "API monitoring",
        href: "/dashboard/admin/api-monitoring",
        icon: Activity,
      },
    ],
  },
  {
    label: "Review",
    items: [
      {
        title: "Campaigns",
        href: "/dashboard/admin/causes",
        icon: Megaphone,
        countKey: "campaigns",
      },
      {
        title: "KYC",
        href: "/dashboard/admin/users/kyc",
        icon: Contact,
        countKey: "kyc",
      },
      {
        title: "Receipts",
        href: "/dashboard/admin/receipts",
        icon: Receipt,
        countKey: "receipts",
      },
      {
        title: "Petitions",
        href: "/dashboard/admin/petitions",
        icon: Flag,
        countKey: "petitions",
      },
      {
        title: "Reports",
        href: "/dashboard/admin/api-reports",
        icon: TriangleAlert,
      },
    ],
  },
  {
    label: "People & growth",
    items: [{ title: "Users", href: "/dashboard/admin/users", icon: Users }],
  },
  {
    label: "System",
    items: [
      { title: "Logs", href: "/dashboard/admin/logs", icon: ScrollText },
      { title: "Cache", href: "/dashboard/admin/cache", icon: Database },
    ],
  },
];

const allHrefs = navGroups.flatMap((group) =>
  group.items.map((item) => item.href),
);

/** Longest matching href wins, so KYC doesn't also light up Users. */
const activeHref = (pathname: string) =>
  allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

export function AdminShellNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { counts } = useAdminShellSummary();
  const current = activeHref(pathname);

  return (
    <nav className="flex flex-col gap-5" aria-label="Admin">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <Eyebrow className="px-3 pb-1 text-[10px] text-ink/40">
            {group.label}
          </Eyebrow>
          {group.items.map((item) => {
            const active = item.href === current;
            const count = item.countKey ? counts?.[item.countKey] : undefined;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-warm-neutral font-semibold text-ink"
                    : "font-medium text-ink/70 hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                {count ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      active
                        ? "bg-ink text-cream"
                        : "bg-cream-muted text-ink/60",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
