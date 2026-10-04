"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Overview", href: "/dashboard/admin/api-monitoring" },
  { label: "Campaigns", href: "/dashboard/admin/api-monitoring/campaigns" },
  { label: "Donations", href: "/dashboard/admin/api-monitoring/donations" },
  { label: "Reports", href: "/dashboard/admin/api-monitoring/reports" },
  { label: "Usage", href: "/dashboard/admin/api-monitoring/usage" },
];

export default function ApiMonitoringNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
