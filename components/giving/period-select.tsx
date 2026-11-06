"use client";

import { Check, ChevronDown } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { GivingPeriod } from "@/actions/giving-actions";
import { formatNaira } from "./format";

export function PeriodSelect({
  period,
  totals,
}: {
  period: GivingPeriod;
  totals: Record<GivingPeriod, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastYear = new Date().getFullYear() - 1;

  const options: { value: GivingPeriod; label: string }[] = [
    { value: "year", label: "This year" },
    { value: "last-year", label: String(lastYear) },
    { value: "all", label: "All time" },
  ];
  const current = options.find((o) => o.value === period) ?? options[2];

  const select = (value: GivingPeriod) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("period");
    else params.set("period", value);
    params.delete("limit");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-11 items-center gap-2 rounded-xl border border-hairline bg-surface px-4 text-sm text-ink/60 outline-none transition-colors hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-blue-accent data-[state=open]:border-blue-accent">
        Period
        <span className="font-semibold text-ink">{current.label}</span>
        <ChevronDown className="h-4 w-4 text-ink/50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl border-hairline bg-surface p-1.5"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => select(option.value)}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-ink focus:bg-bone"
          >
            <span className={option.value === period ? "font-semibold" : ""}>
              {option.label}
            </span>
            {option.value === period ? (
              <Check className="h-4 w-4 text-ink" />
            ) : (
              <span className="text-xs tabular-nums text-ink/50">
                {formatNaira(totals[option.value])}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
