import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UseCase } from "@/types/crowdfund-types";
import { ExampleCause } from "./ExampleCause";
import { LiveCauses, LiveCausesSkeleton } from "./LiveCauses";
import { UseCaseBand } from "./UseCaseBand";

export function UseCaseSection({
  useCase,
  index,
}: {
  useCase: UseCase;
  index: number;
}) {
  return (
    <section
      id={useCase.id}
      aria-labelledby={`${useCase.id}-heading`}
      className="scroll-mt-40 bg-surface pt-12 md:pt-16"
    >
      <UseCaseBand useCase={useCase} index={index} />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-xl font-semibold leading-snug text-ink md:text-2xl">
              {useCase.summary}
            </p>

            <ol className="mt-10">
              {useCase.ideas.map((idea, ideaIndex) => (
                <li
                  key={idea.title}
                  className="flex items-start gap-4 border-b border-hairline pb-6 pt-6 first:pt-0"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/20 text-sm text-ink">
                    {ideaIndex + 1}
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-ink md:text-lg">
                      {idea.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-ink/70 md:text-base">
                      {idea.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <Button asChild variant="accent" size="pill" className="mt-10">
              <Link
                href={`/dashboard/causes/create?category=${useCase.categoryId}`}
              >
                {useCase.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="md:sticky md:top-48 md:self-start">
            <ExampleCause example={useCase.example} />
          </div>
        </div>

        <Suspense fallback={<LiveCausesSkeleton />}>
          <LiveCauses useCase={useCase} />
        </Suspense>
      </div>
    </section>
  );
}
