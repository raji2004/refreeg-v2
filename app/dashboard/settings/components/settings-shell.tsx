"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsNav } from "./settings-nav";

interface SettingsShellProps {
  children: ReactNode;
  isOrganization?: boolean;

  hideNav?: boolean;
  className?: string;
}

export function SettingsShell({
  children,
  isOrganization,
  hideNav = false,
  className,
}: SettingsShellProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8",
        className,
      )}
    >
      <Link
        href="/dashboard/settings"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink/60 transition-colors hover:text-ink lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        All settings
      </Link>

      <div
        className={cn(
          "gap-10",
          hideNav ? "block" : "lg:grid lg:grid-cols-[200px_minmax(0,1fr)]",
        )}
      >
        {!hideNav && (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <SettingsNav isOrganization={isOrganization} />
            </div>
          </aside>
        )}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
