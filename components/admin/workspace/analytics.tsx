"use client";

import { Panel, Chip, Person } from "./primitives";
import { BarPlot, Donut, LinePlot } from "./charts";
import type { WorkItem, WorkspaceData, WorkspaceView } from "./types";

function Empty({ children }: { children: string }) {
  return <p className="py-8 text-center text-xs text-ink/60">{children}</p>;
}

export function AnalyticsContent({
  data,
  compare,
  onView,
  onSelect,
}: {
  data: WorkspaceData;
  compare: boolean;
  onView: (view: WorkspaceView) => void;
  onSelect: (item: WorkItem) => void;
}) {
  const { period, donations } = data;
  const previous = compare ? donations.previous : undefined;

  if (period === "day") {
    const peak = donations.values.indexOf(Math.max(...donations.values));
    const hasGifts = donations.values.some(Boolean);
    return (
      <div className="space-y-[18px]">
        <Panel
          title="Donations by hour"
          aside={
            hasGifts && (
              <span className="text-xs text-ink/60">
                Peak {String(peak).padStart(2, "0")}:00
              </span>
            )
          }
        >
          <BarPlot
            values={donations.values}
            labels={donations.labels}
            className="h-[230px]"
          />
        </Panel>
        <Panel className="overflow-hidden p-0">
          {data.topCampaigns.length ? (
            <table className="workspace-table w-full">
              <thead>
                <tr>
                  {[
                    "Campaign today",
                    "Given",
                    "Donors",
                    "Average gift",
                    "Last 7 days",
                  ].map((v) => (
                    <th className="text-left" key={v}>
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topCampaigns.map((row, i) => (
                  <tr key={row.item.id} className="border-b last:border-0">
                    <td>
                      <button
                        onClick={() => onSelect(row.item)}
                        className="text-left"
                      >
                        <Person
                          name={row.item.name}
                          detail={row.item.detail}
                          initials={row.item.initials}
                          tone={row.item.avatar}
                        />
                      </button>
                    </td>
                    <td className="font-semibold">{row.given}</td>
                    <td className="font-semibold">{row.donors}</td>
                    <td className="font-semibold">{row.averageGift}</td>
                    <td>
                      <LinePlot
                        small
                        values={row.trend}
                        tone={i === 2 ? "blue" : "green"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>No donations yet today.</Empty>
          )}
        </Panel>
      </div>
    );
  }

  if (period === "year")
    return (
      <div className="grid gap-4 xl:grid-cols-[1.93fr_1fr]">
        <Panel
          title="Donations by month"
          aside={
            <div className="flex gap-1.5">
              <Chip tone="blue" dot>
                {data.label.slice(0, 4)}
              </Chip>
              {compare && (
                <Chip tone="neutral" dot>
                  {data.previousLabel}
                </Chip>
              )}
            </div>
          }
        >
          <div className="[&_svg]:h-[235px]">
            <LinePlot
              values={donations.values}
              previous={previous}
              labels={donations.labels}
            />
          </div>
        </Panel>
        <Panel title="Year so far">
          <dl className="space-y-5 text-xs">
            {data.yearSummary.map(([label, value]) => (
              <div className="flex justify-between" key={label}>
                <dt className="text-ink/60">{label}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    );

  return (
    <div className="space-y-[18px]">
      <div className="grid gap-4 xl:grid-cols-[1.78fr_1fr]">
        <Panel title="Donations by day">
          <div className="[&_svg]:h-[165px]">
            <LinePlot
              values={donations.values}
              previous={previous}
              labels={donations.labels}
            />
          </div>
          <div className="mt-4 flex gap-1.5">
            <Chip tone="blue" dot>
              This month
            </Chip>
            {compare && (
              <Chip tone="neutral" dot>
                {data.previousLabel}
              </Chip>
            )}
          </div>
        </Panel>
        <Panel title="Campaigns">
          <Donut
            tones={["green", "gold", "red"]}
            segments={data.campaignStatus.segments}
            total={data.campaignStatus.total}
            caption="live"
          />
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title={
            <button onClick={() => onView("eiza")} className="hover:underline">
              EIZA coins issued
            </button>
          }
          aside={
            <span className="text-xs text-ink/60">
              {data.eiza.total} this month
            </span>
          }
        >
          {data.eiza.segments.length ? (
            <Donut
              segments={data.eiza.segments}
              total={data.eiza.total}
              size={116}
            />
          ) : (
            <Empty>No EIZA issued this month.</Empty>
          )}
        </Panel>
        <Panel
          title={
            <button
              onClick={() => onView("ambassadors")}
              className="hover:underline"
            >
              Top ambassadors
            </button>
          }
          aside={<span className="text-xs text-ink/60">Donations driven</span>}
        >
          {data.ambassadors.length ? (
            <div className="space-y-4">
              {data.ambassadors.slice(0, 4).map((person, i) => (
                <button
                  key={person.id}
                  onClick={() => onView("ambassadors")}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <Person
                      name={person.name}
                      detail={person.region}
                      initials={person.initials}
                      tone={i === 0 ? "blue" : "green"}
                    />
                  </div>
                  <span className="hidden xl:block [&>div]:w-[60px]">
                    <LinePlot values={person.trend} small tone="green" />
                  </span>
                  <strong className="text-xs">{person.donations}</strong>
                </button>
              ))}
            </div>
          ) : (
            <Empty>No referral activity this month.</Empty>
          )}
        </Panel>
        <Panel
          title={
            <button onClick={() => onView("users")} className="hover:underline">
              Users
            </button>
          }
          aside={
            <span className="text-xs text-ink/60">Active, last 30 days</span>
          }
        >
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <strong className="text-[22px]">
                {data.users.monthlyActive}
              </strong>
              <p className="mt-1 text-xs text-ink/60">{data.users.change}</p>
            </div>
            <div>
              <strong className="text-[22px]">{data.users.retention}</strong>
              <p className="mt-1 text-xs text-ink/60">30-day retention</p>
            </div>
          </div>
          <BarPlot
            values={data.users.trend}
            className="h-[70px]"
            lastTone="green"
          />
        </Panel>
      </div>
    </div>
  );
}
