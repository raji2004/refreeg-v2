"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import type { FaqCategory } from "../_data/faqs";

const DEFAULT_OPEN = ["what-is-refreeg", "milestone-releases"];

type FaqListProps = {
  categories: FaqCategory[];
  searching: boolean;
};

export function FaqList({ categories, searching }: FaqListProps) {
  return (
    <div className="flex flex-col gap-14">
      {categories.map((category) => (
        <section
          key={category.id}
          id={`faq-${category.id}`}
          aria-labelledby={`faq-${category.id}-heading`}
          className="scroll-mt-24"
        >
          <h2
            id={`faq-${category.id}-heading`}
            className="mb-5 font-fraunces text-2xl font-normal text-ink md:text-3xl"
          >
            {category.name}
          </h2>

          <Accordion
            // Remount when search toggles so matches open and the defaults return after.
            key={searching ? "search" : "browse"}
            type="multiple"
            defaultValue={
              searching ? category.items.map((item) => item.id) : DEFAULT_OPEN
            }
            className="flex flex-col gap-3"
          >
            {category.items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="rounded-2xl border-none bg-warm-neutral px-5 md:px-7"
              >
                <AccordionTrigger
                  variant="toggle"
                  className="py-5 text-sm text-ink md:text-base"
                >
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl pb-6 text-sm leading-relaxed text-ink/70">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}
