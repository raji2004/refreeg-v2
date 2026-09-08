"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { CommandDialog } from "@/components/ui/command";
import { useDiscoverSearch } from "@/hooks/use-discover-search";
import { DiscoverSearchResults } from "./discover-search-results";

/** Matches Tailwind's `sm` breakpoint — below it, search opens as a dedicated page instead of an overlay. */
const MOBILE_BREAKPOINT_QUERY = "(min-width: 640px)";

export function DiscoverSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const search = useDiscoverSearch({ active: open, onNavigate: () => setOpen(false) });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleTriggerClick = () => {
    const isDesktop =
      typeof window !== "undefined" && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
    if (isDesktop) {
      setOpen(true);
    } else {
      // Spec: mobile search is a dedicated page with a back arrow, not a
      // scrim overlay — see app/causes/search/page.tsx.
      router.push("/causes/search");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-muted-foreground hover:border-slate-300 transition-colors"
      >
        <SearchIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Search campaigns, petitions, NGOs</span>
        <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DiscoverSearchResults search={search} />
      </CommandDialog>
    </>
  );
}
