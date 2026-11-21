"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Menu, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserNav } from "@/components/layout/UserNav";
import { NotificationsMenu } from "@/components/app-shell/notifications-menu";
import { useAdminShellSummary } from "@/hooks/use-admin-shell";

export function AdminShellHeader({
  onOpenMobileNav,
}: {
  onOpenMobileNav: () => void;
}) {
  const router = useRouter();
  const { systemsNormal } = useAdminShellSummary();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <header className="flex items-center gap-3 border-b border-hairline bg-cream px-4 py-3 sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-surface text-ink/70 lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <form
        role="search"
        className="relative min-w-0 max-w-md flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          const search = query.trim();
          router.push(
            search
              ? `/dashboard/admin/users?search=${encodeURIComponent(search)}`
              : "/dashboard/admin/users",
          );
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users by name or email"
          aria-label="Search users"
          className="bg-surface pl-9 pr-12"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-hairline bg-bone px-1.5 py-0.5 text-[10px] font-semibold text-ink/50 sm:block">
          ⌘K
        </kbd>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {systemsNormal !== null && (
          <Badge
            variant={systemsNormal ? "verified" : "critical"}
            className="hidden gap-1.5 md:inline-flex"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${systemsNormal ? "bg-forest" : "bg-rust"}`}
            />
            {systemsNormal
              ? "Live · all systems normal"
              : "Degraded · check health"}
          </Badge>
        )}
        <NotificationsMenu />
        <UserNav />
      </div>
    </header>
  );
}
