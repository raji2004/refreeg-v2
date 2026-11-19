"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  KYC_FACE_MATCH_THRESHOLD,
  kycIdTypeFilterOptions,
} from "@/lib/options/kyc-review.options";

/** URL-param filters under the queue tabs, matching the designer's row. */
export function KycQueueFilters({
  search,
  idType,
  faceMatch,
}: {
  search?: string;
  idType?: string;
  faceMatch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search ?? "");

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ search: query || undefined });
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email or ID number"
          className="w-64 bg-surface pl-9"
          aria-label="Search KYC submissions"
        />
      </form>
      <Select
        value={idType ?? "all"}
        onValueChange={(value) =>
          updateParams({ idType: value === "all" ? undefined : value })
        }
      >
        <SelectTrigger
          className="w-44 bg-surface"
          aria-label="Filter by ID type"
        >
          <SelectValue placeholder="ID type" />
        </SelectTrigger>
        <SelectContent>
          {kycIdTypeFilterOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={faceMatch ?? "any"}
        onValueChange={(value) =>
          updateParams({ faceMatch: value === "any" ? undefined : value })
        }
      >
        <SelectTrigger
          className="w-56 bg-surface"
          aria-label="Filter by face match"
        >
          <SelectValue placeholder="Face match" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any face match</SelectItem>
          <SelectItem value="below">
            {`Face match below ${KYC_FACE_MATCH_THRESHOLD}%`}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
