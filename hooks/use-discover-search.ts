import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { searchDiscover, type DiscoverItem } from "@/actions/discover-actions";

const RECENT_SEARCHES_KEY = "discover:recent-searches";
const RECENT_SEARCHES_LIMIT = 5;

export type OrgResult = {
  id: string;
  name: string;
  logoUrl: string | null;
  username: string | null;
  isVerified: boolean;
};

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
    
  }
}


export function useDiscoverSearch({
  active,
  onNavigate,
}: {
  active: boolean;
  
  onNavigate?: () => void;
}) {
  const router = useRouter();
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
    if (active) setRecentSearches(readRecentSearches());
  }, [active]);

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
    onNavigate?.();
    router.push(`/causes?q=${encodeURIComponent(q)}`);
  };

  const selectCause = (id: string, q: string) => {
    saveRecentSearch(q);
    onNavigate?.();
    router.push(`/causes/${id}`);
  };

  const selectPetition = (id: string, q: string) => {
    saveRecentSearch(q);
    onNavigate?.();
    router.push(`/petitions/${id}`);
  };

  const selectOrg = (org: OrgResult, q: string) => {
    saveRecentSearch(q);
    onNavigate?.();
    if (org.username) router.push(`/${org.username}`);
  };

  const selectRecent = (q: string) => {
    goToFullResults(q);
  };

  return {
    query,
    setQuery,
    loading,
    results,
    recentSearches,
    goToFullResults,
    selectCause,
    selectPetition,
    selectOrg,
    selectRecent,
  };
}
