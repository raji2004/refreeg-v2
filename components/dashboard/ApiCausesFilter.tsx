"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ApiCausesFilterProps {
  search: string;
  modeFilter: string;
}

export function ApiCausesFilter({ search, modeFilter }: ApiCausesFilterProps) {
  return (
    <form className="flex flex-col sm:flex-row gap-3 w-full" method="GET">
      <div className="relative flex-1 md:max-w-md">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          name="search"
          placeholder="Search API, developer ID, mode, or cause..."
          className="pl-8"
          defaultValue={search}
        />
      </div>
      <select
        name="mode"
        defaultValue={modeFilter}
        className="h-9 w-full sm:w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onChange={(e) => e.target.form?.submit()}
      >
        <option value="all">All Modes</option>
        <option value="live">Live Campaigns</option>
        <option value="test">Test Campaigns</option>
      </select>
      <button type="submit" className="hidden">
        Submit
      </button>
    </form>
  );
}
