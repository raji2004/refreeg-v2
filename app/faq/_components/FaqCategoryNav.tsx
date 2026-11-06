"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { FaqCategory } from "../_data/faqs";

export function FaqCategoryNav({ categories }: { categories: FaqCategory[] }) {
  const [activeId, setActiveId] = useState(categories[0]?.id);

  useEffect(() => {
    const sections = categories
      .map((category) => document.getElementById(`faq-${category.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id.replace("faq-", ""));
      },
      { rootMargin: "-96px 0px -55% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories]);

  const current = categories.some((c) => c.id === activeId)
    ? activeId
    : categories[0]?.id;

  if (categories.length === 0) return null;

  return (
    <nav aria-label="FAQ categories">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {categories.map((category) => {
          const active = category.id === current;
          return (
            <li key={category.id} className="shrink-0">
              <a
                href={`#faq-${category.id}`}
                aria-current={active ? "true" : undefined}
                onClick={() => setActiveId(category.id)}
                className={cn(
                  "block rounded-full px-4 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-ink font-medium text-ink-foreground"
                    : "bg-warm-neutral text-ink/70 hover:text-ink lg:bg-transparent",
                )}
              >
                {category.name}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
