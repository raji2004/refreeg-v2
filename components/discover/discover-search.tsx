"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { Search as SearchIcon } from "lucide-react";
import { CommandDialog } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useDiscoverSearch } from "@/hooks/use-discover-search";
import { DiscoverSearchResults } from "./discover-search-results";

const MOBILE_BREAKPOINT_QUERY = "(min-width: 640px)";

export function DiscoverSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const search = useDiscoverSearch({
    active: open,
    onNavigate: () => setOpen(false),
  });

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
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches;
    if (isDesktop) {
      setOpen(true);
    } else {
      router.push("/causes/search");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-label="Search campaigns, petitions and NGOs"
        title="Search (Ctrl/⌘ K)"
        className={cn(
          "group flex h-[42px] items-center gap-2.5 rounded-full border border-hairline bg-white text-sm text-ink/60 transition-colors hover:border-ink/25 hover:text-ink",
          compact ? "w-[42px] shrink-0 justify-center" : "px-3 sm:pl-4 sm:pr-2",
        )}
      >
        <SearchIcon className="h-[18px] w-[18px] shrink-0 stroke-[1.75] text-ink/70 group-hover:text-ink" />
        <span
          className={cn("hidden whitespace-nowrap", !compact && "sm:inline")}
        >
          Search causes
        </span>
        <kbd
          className={cn(
            "ml-3 hidden h-[26px] items-center rounded-full bg-ink/[0.06] px-2.5 font-sans text-[11px] font-medium text-ink/60",
            !compact && "sm:inline-flex",
          )}
        >
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <DiscoverSearchResults search={search} />
      </CommandDialog>
    </>
  );
}
