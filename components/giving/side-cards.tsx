import type { GivingOverview } from "@/actions/giving-actions";
import { formatMonthYear, formatNaira, ordinalDay } from "./format";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "RG"
  );
}

export function RecurringGivingCard({
  recurring,
}: {
  recurring: GivingOverview["recurring"];
}) {
  if (recurring.length === 0) return null;

  return (
    <section className="rounded-2xl bg-surface p-5">
      <h2 className="font-semibold text-ink">Monthly giving</h2>
      <ul className="mt-4 space-y-4">
        {recurring.map((plan) => (
          <li key={plan.id} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">
              {initials(plan.owner)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {plan.title}
              </p>
              <p className="mt-0.5 text-xs text-ink/55">
                {formatNaira(plan.amount)} ·{" "}
                {plan.interval === "weekly"
                  ? "every week"
                  : `${ordinalDay(plan.since)} of the month`}
              </p>
              <p className="mt-0.5 text-xs text-ink/45">
                Since {formatMonthYear(plan.since)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GivenByCauseCard({
  causes,
}: {
  causes: GivingOverview["givenByCause"];
}) {
  if (causes.length === 0) return null;
  const total = causes.reduce((t, c) => t + c.amount, 0) || 1;

  return (
    <section className="rounded-2xl bg-surface p-5">
      <h2 className="font-semibold text-ink">Given by cause</h2>
      <ul className="mt-4 space-y-4">
        {causes.map((cause) => (
          <li key={cause.category}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/75">{cause.label}</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatNaira(cause.amount)}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-muted">
              <div
                className="h-full rounded-full bg-ink"
                style={{
                  width: `${Math.max((cause.amount / total) * 100, 3)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
