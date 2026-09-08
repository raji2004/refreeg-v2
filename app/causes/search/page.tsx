"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Command } from "@/components/ui/command";
import { useDiscoverSearch } from "@/hooks/use-discover-search";
import { DiscoverSearchResults } from "@/components/discover/discover-search-results";

/**
 * Dedicated full-page search surface for narrow viewports — the desktop
 * ⌘K overlay (components/discover/discover-search.tsx) stays a scrim
 * dialog, but the mobile spec calls for a real page with a back arrow
 * instead of an overlay on top of Discover.
 */
export default function DiscoverSearchPage() {
  const router = useRouter();
  const search = useDiscoverSearch({ active: true });

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <div className="flex items-center gap-2 border-b border-ink/10 bg-white px-2 py-2">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-ink/5"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="font-fraunces text-sm text-ink/70">Search Discover</p>
      </div>

      <Command
        shouldFilter={false}
        className="flex flex-1 flex-col overflow-hidden rounded-none bg-transparent"
      >
        <DiscoverSearchResults search={search} listClassName="max-h-none flex-1" autoFocus />
      </Command>
    </div>
  );
}
