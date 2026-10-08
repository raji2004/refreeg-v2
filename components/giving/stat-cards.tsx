import type { GivingOverview } from "@/actions/giving-actions";
import { formatDay, formatNaira } from "./format";

function StatCard({
  label,
  value,
  note,
  noteClassName = "text-ink/55",
  tone = "surface",
}: {
  label: string;
  value: string;
  note?: string;
  noteClassName?: string;
  tone?: "surface" | "sand";
}) {
  return (
    <div
      className={
        tone === "sand"
          ? "rounded-2xl bg-sand p-5"
          : "rounded-2xl bg-surface p-5"
      }
    >
      <p
        className={
          tone === "sand" ? "text-xs text-amber" : "text-xs text-ink/55"
        }
      >
        {label}
      </p>
      <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </p>
      {note && <p className={`mt-3 text-xs ${noteClassName}`}>{note}</p>}
    </div>
  );
}

export function StatCards({ stats }: { stats: GivingOverview["stats"] }) {
  const change = stats.thisYear - stats.lastYear;
  const { openPledges, monthly } = stats;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Given this year"
        value={formatNaira(stats.thisYear)}
        note={
          stats.lastYear > 0
            ? `${change >= 0 ? "Up" : "Down"} ${formatNaira(Math.abs(change))} on last year`
            : undefined
        }
        noteClassName={change >= 0 ? "text-forest" : "text-rust"}
      />
      <StatCard
        label="Open pledges"
        value={formatNaira(openPledges.amount)}
        note={
          openPledges.count > 0
            ? `${openPledges.count} ${openPledges.count === 1 ? "campaign" : "campaigns"}, nothing charged yet`
            : "No open pledges"
        }
      />
      <StatCard
        label="Monthly giving"
        value={formatNaira(monthly.amount)}
        note={
          monthly.nextCharge
            ? `Next charge ${formatDay(monthly.nextCharge)}`
            : "No monthly gifts set up"
        }
      />
      <StatCard
        label="EIZA earned"
        value={stats.eiza.toLocaleString()}
        tone="sand"
      />
    </div>
  );
}
