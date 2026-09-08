"use client";

import { getCampaignCategoryStyle } from "@/lib/campaign-categories";
import { categories } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CampaignCategorySelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  invalid?: boolean;
  className?: string;
};

export function CampaignCategorySelect({
  value,
  onValueChange,
  invalid = false,
  className,
}: CampaignCategorySelectProps) {
  const selectedCategory = value ? getCampaignCategoryStyle(value) : null;
  const SelectedIcon = selectedCategory?.icon;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id="category"
        aria-invalid={invalid}
        className={cn(
          "premium-input h-11 sm:h-12",
          invalid && "border-red-500",
          className,
        )}
      >
        <SelectValue placeholder="What's this about?">
          {selectedCategory && SelectedIcon ? (
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  selectedCategory.iconBackgroundClassName,
                )}
              >
                <SelectedIcon
                  className={cn("h-4 w-4", selectedCategory.iconClassName)}
                />
              </span>
              <span className="font-medium text-slate-800">
                {selectedCategory.name}
              </span>
            </span>
          ) : undefined}
        </SelectValue>
      </SelectTrigger>

      <SelectContent className="rounded-xl border-slate-200 p-1 shadow-xl">
        {categories.map((category) => {
          const categoryStyle = getCampaignCategoryStyle(category.id);
          const CategoryIcon = categoryStyle.icon;

          return (
            <SelectItem
              key={category.id}
              value={category.id}
              className="rounded-lg py-2.5 pl-9 pr-3 focus:bg-slate-50 data-[state=checked]:bg-blue-50"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    categoryStyle.iconBackgroundClassName,
                  )}
                >
                  <CategoryIcon
                    className={cn("h-4 w-4", categoryStyle.iconClassName)}
                  />
                </span>
                <span className="font-medium text-slate-800">
                  {categoryStyle.name}
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
