"use client";

import { ArrowRight, Search } from "lucide-react";

type FaqHeroProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
};

export function FaqHero({ query, onQueryChange, onSubmit }: FaqHeroProps) {
  return (
    <section className="bg-surface px-4 pb-14 pt-10 sm:px-6 md:pb-20 md:pt-16">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3 py-1 text-xs font-medium text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-ink" />
          Help centre
        </span>

        <h1 className="mt-6 font-fraunces text-4xl font-normal leading-[1.05] tracking-tight text-ink sm:text-5xl md:text-6xl lg:text-7xl">
          Questions? We&apos;ve got{" "}
          <span className="text-brand-blue">answers.</span>
        </h1>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-full bg-warm-neutral py-1.5 pl-5 pr-1.5"
        >
          <Search className="h-4 w-4 shrink-0 text-ink/50" aria-hidden="true" />
          <label htmlFor="faq-search" className="sr-only">
            Search for a question
          </label>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search for a question"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink/50"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-medium text-brand-blue-foreground transition-opacity hover:opacity-90"
          >
            Search
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
}
