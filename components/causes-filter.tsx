"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  BriefcaseBusiness,
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
    <ScrollArea className="w-full pb-3">
      <div className="grid w-full min-w-[1020px] grid-cols-6 gap-3 px-0.5 py-2">
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
                "group flex h-[76px] items-center gap-3 rounded-2xl border px-4 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
                isSelected
                  ? "border-secondary bg-secondary text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-800 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
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
              <span className="min-w-0 text-sm font-semibold leading-tight">
                {category.name}
              </span>
            </button>
          );
        })}
        </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
