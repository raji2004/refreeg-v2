"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search as SearchIcon, FileText, Flag, Building2, BadgeCheck } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";
import { searchDiscover, type DiscoverItem } from "@/actions/discover-actions";
import { getMediaUrl } from "@/lib/s3/media";

const RECENT_SEARCHES_KEY = "discover:recent-searches";
const RECENT_SEARCHES_LIMIT = 5;

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = readRecentSearches().filter((q) => q !== query);
    const next = [query, ...existing].slice(0, RECENT_SEARCHES_LIMIT);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // best-effort only
  }
}

/** Splits `text` on `query` (case-insensitive) and wraps matches in a gold-wash <mark>. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-300/50 text-inherit rounded-sm">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

type OrgResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  username: string | null;
  isVerified: boolean;
};

export function DiscoverSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    campaigns: DiscoverItem[];
    petitions: DiscoverItem[];
    organizations: OrgResult[];
    totalCount: number;
  } | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);

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

  useEffect(() => {
    if (open) setRecentSearches(readRecentSearches());
  }, [open]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchDiscover(debouncedQuery)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults({ campaigns: [], petitions: [], organizations: [], totalCount: 0 });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const goToFullResults = (q: string) => {
    saveRecentSearch(q);
    setOpen(false);
    router.push(`/causes?search=${encodeURIComponent(q)}`);
  };

  const suggestedCauses = useMemo(
    () => (!query.trim() ? [] : []),
    [query],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-muted-foreground hover:border-slate-300 transition-colors"
      >
        <SearchIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Search campaigns, petitions, NGOs</span>
        <kbd className="hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search campaigns, petitions, organisations…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!query.trim() && (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent searches">
                  {recentSearches.map((q) => (
                    <CommandItem key={q} onSelect={() => goToFullResults(q)}>
                      <SearchIcon className="h-4 w-4 text-muted-foreground" />
                      {q}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandEmpty>Start typing to search Discover.</CommandEmpty>
            </>
          )}

          {query.trim() && loading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Searching…
            </div>
          )}

          {query.trim() && !loading && results && (
            <>
              {results.totalCount === 0 && (
                <CommandEmpty>No matches for “{query}”.</CommandEmpty>
              )}

              {results.campaigns.length > 0 && (
                <CommandGroup heading="Campaigns">
                  {results.campaigns.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => {
                        saveRecentSearch(query);
                        setOpen(false);
                        router.push(`/causes/${item.id}`);
                      }}
                      className="gap-3"
                    >
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-slate-100">
                        {item.image && (
                          <Image
                            src={getMediaUrl(item.image)}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          <HighlightedText text={item.title} query={query} />
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.orgName} · {item.percent}% funded
                          {item.urgent ? " · Urgent" : ""}
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.petitions.length > 0 && (
                <CommandGroup heading="Petitions">
                  {results.petitions.map((item) => (
                    <CommandItem
                      key={item.id}
                      onSelect={() => {
                        saveRecentSearch(query);
                        setOpen(false);
                        router.push(`/petitions/${item.id}`);
                      }}
                      className="gap-3"
                    >
                      <Flag className="h-4 w-4 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          <HighlightedText text={item.title} query={query} />
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.raised.toLocaleString()} of{" "}
                          {item.goal.toLocaleString()} signatures
                        </p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.organizations.length > 0 && (
                <CommandGroup heading="Organisations">
                  {results.organizations.map((org) => (
                    <CommandItem
                      key={org.id}
                      onSelect={() => {
                        saveRecentSearch(query);
                        setOpen(false);
                        if (org.username) router.push(`/${org.username}`);
                      }}
                      className="gap-3"
                    >
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span className="flex-1 truncate">
                        <HighlightedText text={org.name} query={query} />
                      </span>
                      {org.isVerified && (
                        <BadgeCheck className="h-4 w-4 text-blue-600" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.totalCount > 0 && (
                <>
                  <CommandSeparator />
                  <CommandItem onSelect={() => goToFullResults(query)}>
                    See all {results.totalCount} results
                  </CommandItem>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
