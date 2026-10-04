"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DeveloperNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "API Keys", href: "/dashboard/developer/api-keys" },
    { name: "Webhooks", href: "/dashboard/developer/webhooks" },
    { name: "Reports", href: "/dashboard/developer/reports" },
    { name: "API Docs", href: "/docs/api" },
  ];

  return (
    <nav className="flex gap-4 mt-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium px-4 py-2 rounded-md transition-colors border-b-2 ${
              isActive
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
