"use client";

import Image from "next/image";
import { Search as SearchIcon, Flag, Building2, BadgeCheck } from "lucide-react";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getMediaUrl } from "@/lib/s3/media";
import type { useDiscoverSearch } from "@/hooks/use-discover-search";

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

/**
 * The shared `<CommandInput>` + `<CommandList>` body behind Discover
 * search — rendered inside a `CommandDialog` on desktop (discover-search.tsx)
 * and inside a plain full-page `<Command>` on mobile (app/causes/search),
 * so both surfaces share one implementation of the actual search UX.
 */
export function DiscoverSearchResults({
  search,
  inputPlaceholder = "Search campaigns, petitions, organisations…",
  autoFocus,
  listClassName,
}: {
  search: ReturnType<typeof useDiscoverSearch>;
  inputPlaceholder?: string;
  autoFocus?: boolean;
  /** Overrides CommandList's default max-h-[300px] — the full-page mobile surface wants it to fill the viewport instead. */
  listClassName?: string;
}) {
  const { query, setQuery, loading, results, recentSearches, goToFullResults, selectCause, selectPetition, selectOrg, selectRecent } =
    search;

  return (
    <>
      <CommandInput
        placeholder={inputPlaceholder}
        value={query}
        onValueChange={setQuery}
        autoFocus={autoFocus}
      />
      <CommandList className={listClassName}>
        {!query.trim() && (
          <>
            {recentSearches.length > 0 && (
              <CommandGroup heading="Recent searches">
                {recentSearches.map((q) => (
                  <CommandItem key={q} onSelect={() => selectRecent(q)}>
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
          <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
        )}

        {query.trim() && !loading && results && (
          <>
            {results.totalCount === 0 && <CommandEmpty>No matches for “{query}”.</CommandEmpty>}

            {results.campaigns.length > 0 && (
              <CommandGroup heading="Campaigns">
                {results.campaigns.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => selectCause(item.id, query)}
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
                    onSelect={() => selectPetition(item.id, query)}
                    className="gap-3"
                  >
                    <Flag className="h-4 w-4 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        <HighlightedText text={item.title} query={query} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.raised.toLocaleString()} of {item.goal.toLocaleString()} signatures
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
                    onSelect={() => selectOrg(org, query)}
                    className="gap-3"
                  >
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span className="flex-1 truncate">
                      <HighlightedText text={org.name} query={query} />
                    </span>
                    {org.isVerified && <BadgeCheck className="h-4 w-4 text-blue-600" />}
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
    </>
  );
}
