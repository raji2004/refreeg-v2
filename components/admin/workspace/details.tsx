"use client";

import { useState } from "react";
import { Search, TriangleAlert } from "lucide-react";
import { CalloutBanner } from "@/components/ui/callout-banner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Panel, Person } from "./primitives";
import { Donut, Breakdown, LinePlot } from "./charts";
import { ambassadors, monthlyLine } from "./sample-data";
import { eizaSegments } from "./analytics";
import type { Period, WorkspaceView } from "./types";

export function DetailContent({
  view,
  query,
  period,
}: {
  view: WorkspaceView;
  query: string;
  period: Period;
}) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [roi, setRoi] = useState("all");
  if (view === "ambassadors") {
    const filtered = ambassadors.filter(
      (person) =>
        `${person.name} ${person.region}`
          .toLowerCase()
          .includes((search || query).toLowerCase()) &&
        (region === "all" || person.region === region) &&
        (roi === "all" || person.roi < Number(roi)),
    );
    return (
      <div className="space-y-[18px]">
        <div className="flex flex-wrap gap-2">
          <label className="flex h-9 w-[260px] items-center gap-2 rounded-xl bg-surface px-3">
            <Search className="h-3.5 w-3.5 text-ink/60" />
            <input
              aria-label="Search ambassadors"
              placeholder="Search ambassadors"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </label>
          <select
            aria-label="Region"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            className="rounded-xl bg-surface px-3 text-xs"
          >
            <option value="all">Region · All</option>
            {ambassadors.map((p) => (
              <option key={p.region}>{p.region}</option>
            ))}
          </select>
          <select
            aria-label="Filter ambassador ROI"
            value={roi}
            onChange={(event) => setRoi(event.target.value)}
            className="rounded-xl bg-surface px-3 text-xs"
          >
            <option value="all">ROI · All</option>
            <option value="10">ROI below 10×</option>
            <option value="40">ROI below 40×</option>
          </select>
        </div>
        <Panel className="overflow-hidden p-0">
          <Table className="workspace-table">
            <TableHeader>
              <TableRow>
                {[
                  "Ambassador",
                  "Region",
                  "Referrals",
                  "Donations driven",
                  "Conversion",
                  "Rewards paid",
                  "ROI",
                  "Trend",
                ].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person, i) => (
                <TableRow key={person.name}>
                  <TableCell>
                    <Person
                      name={person.name}
                      detail="Ambassador"
                      initials={person.initials}
                      tone={i % 3 === 0 ? "blue" : "green"}
                    />
                  </TableCell>
                  <TableCell className="text-ink/60">{person.region}</TableCell>
                  <TableCell className="font-semibold">
                    {person.referrals}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {person.donations}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {person.conversion}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {person.rewards}
                  </TableCell>
                  <TableCell
                    className={
                      person.roi < 10
                        ? "font-semibold text-rust"
                        : "font-semibold"
                    }
                  >
                    {person.roi}×
                  </TableCell>
                  <TableCell>
                    <LinePlot
                      small
                      tone={person.roi < 10 ? "red" : "green"}
                      values={person.trend}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-ink/60"
                  >
                    No ambassadors match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Panel>
      </div>
    );
  }
  if (view === "eiza")
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Issued by source">
          <Donut
            size={180}
            total="2.8M"
            caption="EIZA"
            segments={eizaSegments.map((segment, i) => ({
              ...segment,
              label: [
                "Donations",
                "Bounties",
                "Petition signatures",
                "Daily check-ins",
                "Referrals",
              ][i],
              display: ["1.46M", "588k", "392k", "224k", "140k"][i],
            }))}
          />
        </Panel>
        <Panel title="Redeemed for">
          <Breakdown
            rows={[
              { label: "Giving to campaigns", value: 46, tone: "green" },
              { label: "Airtime and data", value: 31, tone: "blue" },
              { label: "Cash to bank", value: 17, tone: "gold" },
              { label: "Merch vouchers", value: 6, tone: "neutral" },
            ]}
          />
          <CalloutBanner
            variant="gold"
            icon={<TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            title="Concentration is rising. 12 of the top 100 holders were flagged by reward abuse detection this month."
            className="mt-4 border-0 text-xs leading-5 text-amber [&_p]:font-normal"
          />
        </Panel>
      </div>
    );
  const cohorts = [
    [100, 58, 46, 41, 38, 36],
    [100, 61, 48, 43, 40],
    [100, 60, 49, 44],
    [100, 63, 51],
    [100, 65],
    [100],
  ];
  const values =
    period === "day"
      ? monthlyLine.slice(3)
      : period === "year"
        ? monthlyLine.map((v) => v * 1.6)
        : monthlyLine;
  return (
    <div className="grid gap-4 xl:grid-cols-[1.14fr_1fr]">
      <Panel
        title="New vs returning"
        className="min-h-[329px]"
        aside={
          <div className="flex gap-1.5">
            <span className="rounded-full bg-blue-accent/15 px-2 py-1 text-[10px] font-semibold text-blue-accent">
              ● Returning
            </span>
            <span className="rounded-full bg-forest/15 px-2 py-1 text-[10px] font-semibold text-forest">
              ● New
            </span>
          </div>
        }
      >
        <div className="[&_svg]:h-[245px]">
          <LinePlot values={values} secondary={values.map((v) => v / 12)} />
        </div>
      </Panel>
      <Panel
        title="Retention by sign-up month"
        aside={<span className="text-xs text-ink/60">% still active</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-separate border-spacing-[3px] text-center text-xs">
            <caption className="sr-only">
              Monthly cohort retention percentages
            </caption>
            <thead>
              <tr>
                <th aria-label="Cohort month" />
                {[1, 2, 3, 4, 5, 6].map((v) => (
                  <th
                    key={v}
                    scope="col"
                    className="pb-1 text-[10px] font-semibold text-ink/60"
                  >
                    M{v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((row, i) => (
                <tr key={i}>
                  <th scope="row" className="pr-10 text-left font-normal">
                    {["May", "Jun", "Jul", "Aug", "Sep", "Oct"][i]}
                  </th>
                  {row.map((value, j) => (
                    <td
                      key={j}
                      className="h-[31px] min-w-[48px] rounded-md font-medium"
                      style={{
                        backgroundColor: `hsl(var(--forest) / ${value / 100})`,
                        color:
                          value > 45
                            ? "hsl(var(--surface))"
                            : "hsl(var(--ink))",
                      }}
                    >
                      {value}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
