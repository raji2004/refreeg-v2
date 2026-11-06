"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";

/** Header search on My giving: filters the gift list by campaign or organiser. */
export function GivingSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const lastPushed = useRef(value);

  useEffect(() => {
    const next = value.trim();
    if (next === lastPushed.current) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("limit");
      lastPushed.current = next;
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [value, pathname, router, searchParams]);

  return (
    <label className="flex w-full max-w-sm items-center gap-2 rounded-full border border-hairline bg-surface px-3.5 py-2 text-sm text-ink/60 transition-colors focus-within:border-ink/40">
      <Search className="h-4 w-4 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search your giving"
        aria-label="Search your giving"
        className="w-full bg-transparent text-ink outline-none placeholder:text-ink/45"
      />
    </label>
  );
}
