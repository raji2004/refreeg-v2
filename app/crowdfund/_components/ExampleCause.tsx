import { formatNaira } from "@/components/giving/format";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import type { UseCase } from "../_data/use-cases";

export function ExampleCause({ example }: { example: UseCase["example"] }) {
  const percent = (example.raised / example.goal) * 100;

  return (
    <div className="rounded-2xl bg-warm-neutral p-6 sm:p-8 md:p-10">
      <Eyebrow className="block font-normal">
        An example · {example.location}
      </Eyebrow>
      <h3 className="mt-4 max-w-xs text-xl font-semibold leading-snug text-ink md:text-2xl">
        {example.title}
      </h3>

      <Progress
        value={percent}
        indicatorVariant="blue"
        aria-label={`${Math.round(percent)}% of goal raised`}
        className="mt-8 h-1 rounded-none bg-ink/10"
      />
      <div className="mt-3 flex items-baseline justify-between text-sm text-ink">
        <span className="font-semibold">
          {formatNaira(example.raised)} raised
        </span>
        <span>of {formatNaira(example.goal)}</span>
      </div>

      <ol className="mt-8">
        {example.milestones.map((milestone, index) => (
          <li
            key={milestone.label}
            className="flex items-baseline gap-4 border-t border-ink/10 py-4"
          >
            <span className="font-fraunces text-sm italic text-ink/50">
              {index + 1}
            </span>
            <span className="flex-1 text-sm text-ink">
              {milestone.label}
              <span
                className={cn(
                  "mt-1 block text-xs font-medium",
                  milestone.released ? "text-forest" : "text-amber",
                )}
              >
                {milestone.released ? "Released with proof" : "Awaiting proof"}
              </span>
            </span>
            <span className="text-sm font-semibold text-ink">
              {formatNaira(milestone.amount)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
