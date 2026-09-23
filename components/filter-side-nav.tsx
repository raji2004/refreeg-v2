"use client";

import { Button } from "@/components/ui/button";
import { X, MapPin, Layers } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface FilterSideNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const categories = [
  "education",
  "health",
  "community",
  "environment",
  "disaster",
  "creative",
  "business",
];

const categoryLabels: Record<string, string> = {
  education: "Education",
  health: "Healthcare",
  community: "Community",
  environment: "Environment",
  disaster: "Disaster Relief",
  creative: "Creative",
  business: "Business",
};

const nigerianStates = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Federal Capital Territory (Abuja)",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export function FilterSideNav({ isOpen, onClose }: FilterSideNavProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("category") || "all",
  );

  useEffect(() => {
    setSelectedCategory(searchParams.get("category") || "all");
  }, [searchParams]);

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    if (checked) {
      setSelectedCategory(categoryId);
    } else {
      setSelectedCategory("all");
    }
  };

  const handleApplyFilters = () => {
    const next = new URLSearchParams(searchParams.toString());

    next.delete("page");

    if (selectedCategory && selectedCategory !== "all") {
      next.set("category", selectedCategory);
    } else {
      next.delete("category");
    }

    next.delete("filter");

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    onClose();
  };

  const handleClearFilters = () => {
    setSelectedCategory("all");
    const next = new URLSearchParams();
    // Keep non-filter params
    const recommended = searchParams.get("recommended");
    const search = searchParams.get("search");
    if (recommended) next.set("recommended", recommended);
    if (search) next.set("search", search);

    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      )}

      {/* Side Navigation */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold text-left">Filters</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Accordion Filters */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <Accordion type="multiple" defaultValue={["campaign", "location"]}>
              {/* Category Filter */}
              <AccordionItem value="campaign">
                <AccordionTrigger className="flex items-center gap-2 text-base font-medium text-left">
                  <Layers className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-left">Category</span>
                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pl-6 text-left">
                  {categories.map((cat) => (
                    <div key={cat} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cat-${cat}`}
                        checked={selectedCategory === cat}
                        onCheckedChange={(checked) =>
                          handleCategoryToggle(cat, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`cat-${cat}`}
                        className="text-sm font-normal capitalize"
                      >
                        {categoryLabels[cat] || cat}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Location — informational only for now */}
              <AccordionItem value="location">
                <AccordionTrigger className="flex items-center gap-2 text-base font-medium text-left">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-left">Location</span>
                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pl-6 text-left max-h-60 overflow-y-auto">
                  {nigerianStates.map((state) => (
                    <div key={state} className="flex items-center space-x-2">
                      <Checkbox id={`loc-${state}`} disabled />
                      <Label
                        htmlFor={`loc-${state}`}
                        className="text-sm font-normal text-muted-foreground"
                      >
                        {state}
                      </Label>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground italic pt-2">
                    Location filter coming soon
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Footer */}
          <div className="p-6 border-t space-y-3">
            <Button onClick={handleApplyFilters} className="w-full">
              Apply Filters
            </Button>
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="w-full"
            >
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
