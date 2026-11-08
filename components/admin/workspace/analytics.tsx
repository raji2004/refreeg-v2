"use client";

import { Panel, Chip, Person } from "./primitives";
import { BarPlot, Donut, LinePlot } from "./charts";
import {
  ambassadors,
  hourlyBars,
  monthlyLine,
  reviewItems,
} from "./sample-data";
import type { Period, WorkItem, WorkspaceView } from "./types";

export const eizaSegments = [
  { label: "Donations", value: 52, display: "52%" },
  { label: "Bounties", value: 21, display: "21%" },
  { label: "Petitions", value: 14, display: "14%" },
  { label: "Check-ins", value: 8, display: "8%" },
  { label: "Referrals", value: 5, display: "5%" },
];
export function AnalyticsContent({
  period,
  compare,
  onView,
  onSelect,
}: {
  period: Period;
  compare: boolean;
  onView: (view: WorkspaceView) => void;
  onSelect: (item: WorkItem) => void;
}) {
  const line =
    period === "year"
      ? monthlyLine
      : [80, 86, 92, 86, 100, 106, 94, 100, 112, 106, 118, 112, 124, 118, 130];
  const previous = compare
    ? line.map((v, i) => v * 0.65 + (i % 2 ? 1 : -3))
    : undefined;
  if (period === "day")
    return (
      <div className="space-y-[18px]">
        <Panel
          title="Donations by hour"
          aside={<span className="text-xs text-ink/60">Peak 20:00–22:00</span>}
        >
          <BarPlot
            values={hourlyBars}
            labels={["00:00", "06:00", "12:00", "18:00", "23:00"]}
            className="h-[230px]"
          />
        </Panel>
        <Panel className="overflow-hidden p-0">
          <table className="workspace-table w-full">
            <thead>
              <tr>
                {[
                  "Campaign today",
                  "Given",
                  "Donors",
                  "Conversion",
                  "Trend",
                ].map((v) => (
                  <th className="text-left" key={v}>
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[reviewItems[1], reviewItems[0], reviewItems[3]].map(
                (item, i) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td>
                      <button
                        onClick={() => onSelect(item)}
                        className="text-left"
                      >
                        <Person
                          name={item.name}
                          detail={item.detail}
                          initials={item.initials}
                          tone={item.avatar}
                        />
                      </button>
                    </td>
                    <td className="font-semibold">
                      {["₦2.4M", "₦1.1M", "₦640k"][i]}
                    </td>
                    <td className="font-semibold">{[612, 204, 131][i]}</td>
                    <td className="font-semibold">
                      {["9.2%", "11.4%", "5.8%"][i]}
                    </td>
                    <td>
                      <LinePlot
                        small
                        values={ambassadors[i].trend}
                        tone={i === 2 ? "blue" : "green"}
                      />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </Panel>
      </div>
    );
  if (period === "year")
    return (
      <div className="grid gap-4 xl:grid-cols-[1.93fr_1fr]">
        <Panel
          title="Donations by month"
          aside={
            <div className="flex gap-1.5">
              <Chip tone="blue" dot>
                2026
              </Chip>
              {compare && (
                <Chip tone="neutral" dot>
                  2025
                </Chip>
              )}
            </div>
          }
        >
          <div className="[&_svg]:h-[235px]">
            <LinePlot
              values={line}
              previous={previous}
              labels={[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
              ]}
            />
          </div>
        </Panel>
        <Panel title="Year so far">
          <dl className="space-y-5 text-xs">
            {[
              ["Donors", "212,480"],
              ["Gifts per donor", "3.4"],
              ["Average gift", "₦5,420"],
              ["EIZA issued", "24.6M"],
              ["New users", "61,200"],
              ["Ambassador-driven", "₦612M · 16%"],
            ].map(([label, value]) => (
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
            <LinePlot values={line} previous={previous} />
          </div>
          <div className="mt-4 flex gap-1.5">
            <Chip tone="blue" dot>
              October
            </Chip>
            {compare && (
              <Chip tone="neutral" dot>
                September
              </Chip>
            )}
          </div>
        </Panel>
        <Panel title="Campaigns">
          <Donut
            tones={["green", "gold", "red"]}
            segments={[
              { label: "Active", value: 1240, display: "1,240" },
              { label: "Inactive 21+ days", value: 312, display: "312" },
              { label: "Paused by rules", value: 96, display: "96" },
            ]}
            total="1,648"
            caption="total"
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
          aside={<span className="text-xs text-ink/60">2.8M this month</span>}
        >
          <Donut segments={eizaSegments} total="2.8M" size={116} />
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
          <div className="space-y-4">
            {ambassadors.slice(0, 4).map((person, i) => (
              <button
                key={person.name}
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
        </Panel>
        <Panel
          title={
            <button onClick={() => onView("users")} className="hover:underline">
              Users
            </button>
          }
          aside={<span className="text-xs text-ink/60">Monthly active</span>}
        >
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <strong className="text-[22px]">84,210</strong>
              <p className="mt-1 text-xs text-ink/60">+6.1% vs September</p>
            </div>
            <div>
              <strong className="text-[22px]">41%</strong>
              <p className="mt-1 text-xs text-ink/60">30-day retention</p>
            </div>
          </div>
          <BarPlot
            values={[61, 64, 68, 67, 71, 74, 77, 82, 85, 89, 94, 100]}
            className="h-[70px]"
            lastTone="green"
          />
        </Panel>
      </div>
    </div>
  );
}
