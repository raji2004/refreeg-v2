"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsItemProps {
  title: string;
  description: string;
  href: string;
  icon?: React.ReactNode;
  destructive?: boolean;
}

export function SettingsItem({
  title,
  description,
  href,
  icon,
  destructive,
}: SettingsItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-xl border-2 border-ink/10 bg-white px-4 py-4 transition-colors",
        "hover:border-ink/30 hover:bg-cream",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {icon ? (
          <div
            className={cn(
              "text-ink/40 transition-colors group-hover:text-ink",
              destructive && "text-destructive/60 group-hover:text-destructive",
            )}
          >
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-base font-medium text-ink",
              destructive && "text-destructive",
            )}
          >
            {title}
          </h3>
          <p className="mt-1 text-sm text-ink/55">{description}</p>
        </div>
      </div>

      <ChevronRight
        className={cn(
          "ml-4 h-5 w-5 text-ink/30 transition-transform group-hover:translate-x-0.5 group-hover:text-ink/60",
          destructive && "text-destructive/40",
        )}
      />
    </Link>
  );
}
