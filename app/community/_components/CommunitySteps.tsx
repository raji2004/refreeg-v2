import { Eyebrow } from "@/components/ui/eyebrow";

import { stats, steps } from "../_data/community";

export function CommunitySteps() {
  return (
    <section className="bg-surface px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[2fr_3fr] md:gap-16">
          <div className="max-w-md">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 font-fraunces text-4xl font-normal leading-tight text-ink md:text-5xl">
              Three steps to a <span className="text-brand-blue">louder</span>{" "}
              cause
            </h2>
          </div>

          <ol className="divide-y divide-hairline border-y border-hairline">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-6 py-6">
                <span className="font-fraunces text-3xl leading-none text-brand-blue">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-hairline md:mt-24 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse gap-2 bg-warm-neutral p-6 md:p-8"
            >
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink/60">
                {stat.label}
              </dt>
              <dd className="font-fraunces text-4xl font-normal text-ink md:text-5xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
