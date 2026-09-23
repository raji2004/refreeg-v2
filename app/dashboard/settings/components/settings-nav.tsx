"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";

const NAV_ITEMS = [
  { title: "Profile", href: "/dashboard/settings/profile" },
  { title: "Notifications", href: "/dashboard/settings/notifications" },
  { title: "Payments", href: "/dashboard/settings/bank" },
  { title: "Organization", href: "/dashboard/settings/organization", orgOnly: true },
  { title: "Security", href: "/dashboard/settings/account" },
  {
    title: "Verification",
    href: "/dashboard/settings/kyc",
    todo: true,
  },
] as const;

interface SettingsNavProps {
  isOrganization?: boolean;
  className?: string;
}

export function SettingsNav({ isOrganization, className }: SettingsNavProps) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter(
    (item) => !("orgOnly" in item && item.orgOnly) || isOrganization,
  );

  return (
    <nav className={cn("space-y-1", className)} aria-label="Settings">
      <Eyebrow className="mb-3 px-3 text-ink/45">Settings</Eyebrow>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-full px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-cream-muted font-semibold text-ink"
                    : "font-medium text-ink/60 hover:bg-cream-muted/70 hover:text-ink",
                )}
              >
                <span>{item.title}</span>
                {"todo" in item && item.todo ? (
                  <Badge
                    variant="pending"
                    className="rounded-md px-1.5 py-0 text-[10px] tracking-wide"
                  >
                    TODO
                  </Badge>
                ) : null}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/dashboard/settings/account"
            className="flex items-center rounded-full px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
          >
            Close account
          </Link>
        </li>
      </ul>
    </nav>
  );
}
