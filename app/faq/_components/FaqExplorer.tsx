"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

import { faqCategories } from "../_data/faqs";
import { FaqCategoryNav } from "./FaqCategoryNav";
import { FaqHero } from "./FaqHero";
import { FaqList } from "./FaqList";
import { StillStuckCard } from "./StillStuckCard";

const RESULTS_ID = "faq-results";

export function FaqExplorer({ marquee }: { marquee: ReactNode }) {
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqCategories;
    return faqCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [query]);

  const handleSubmit = () => {
    document
      .getElementById(RESULTS_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <FaqHero query={query} onQueryChange={setQuery} onSubmit={handleSubmit} />

      {marquee}

      <section
        id={RESULTS_ID}
        className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <div className="grid gap-10 lg:grid-cols-[240px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <FaqCategoryNav categories={categories} />
            <StillStuckCard className="mt-8 hidden lg:block" />
          </aside>

          <div>
            {categories.length > 0 ? (
              <FaqList
                categories={categories}
                searching={query.trim() !== ""}
              />
            ) : (
              <EmptyState
                variant="page"
                icon={<SearchX className="h-6 w-6" />}
                title="No matching questions"
                description="Try a different word, or ask us in the Telegram community."
                className="py-16"
              />
            )}
            <StillStuckCard className="mt-12 lg:hidden" />
          </div>
        </div>
      </section>
    </>
  );
}
