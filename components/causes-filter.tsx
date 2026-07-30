"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusiness,
  ChevronsRight,
  GraduationCap,
  HeartPulse,
  LifeBuoy,
  Palette,
  Users,
  type LucideIcon,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
}

interface CausesFilterProps {
  selectedCategory: string;
}

const categories: Category[] = [
  {
    id: "education",
    name: "Education",
    icon: GraduationCap,
    iconClassName: "text-blue-700",
    iconBackgroundClassName: "bg-blue-100",
  },
  {
    id: "health",
    name: "Healthcare",
    icon: HeartPulse,
    iconClassName: "text-rose-700",
    iconBackgroundClassName: "bg-rose-100",
  },
  {
    id: "community",
    name: "Community",
    icon: Users,
    iconClassName: "text-violet-700",
    iconBackgroundClassName: "bg-violet-100",
  },
  {
    id: "disaster",
    name: "Disaster Relief",
    icon: LifeBuoy,
    iconClassName: "text-orange-700",
    iconBackgroundClassName: "bg-orange-100",
  },
  {
    id: "creative",
    name: "Creative",
    icon: Palette,
    iconClassName: "text-pink-700",
    iconBackgroundClassName: "bg-pink-100",
  },
  {
    id: "business",
    name: "Business",
    icon: BriefcaseBusiness,
    iconClassName: "text-emerald-700",
    iconBackgroundClassName: "bg-emerald-100",
  },
];

export function CausesFilter({ selectedCategory }: CausesFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleCategoryChange = (categoryId: string) => {
    // Preserve existing params (search, sort, etc.)
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 on category change
    params.delete("page");

    if (categoryId !== "all") {
      params.set("category", categoryId);
    } else {
      params.delete("category");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 px-0.5 md:hidden">
        <p className="text-xs font-semibold text-slate-700">Explore sectors</p>
        <p className="flex items-center gap-1 text-[11px] font-medium text-blue-700">
          Swipe to see more
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </p>
      </div>

      <div className="relative">
        <ScrollArea className="w-full pb-3">
          <div className="flex w-max gap-3 px-0.5 py-2 md:grid md:w-full md:min-w-[1020px] md:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleCategoryChange(category.id)}
                  className={cn(
                    "group flex h-[76px] w-[154px] shrink-0 items-center gap-2.5 overflow-hidden rounded-2xl border px-3 text-left transition-all duration-200 md:w-auto md:gap-3 md:px-4",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                    isSelected
                      ? "border-secondary bg-secondary text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 md:h-11 md:w-11",
                      isSelected
                        ? "bg-white/15"
                        : category.iconBackgroundClassName,
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        isSelected ? "text-white" : category.iconClassName,
                      )}
                      aria-hidden="true"
                    />
                  </span>
                  <span className="line-clamp-2 min-w-0 break-words text-[13px] font-semibold leading-[1.25] md:text-sm">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div
          className="pointer-events-none absolute inset-y-2 right-0 w-8 bg-gradient-to-l from-white to-transparent md:hidden"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
