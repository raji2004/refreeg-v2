"use client";

import { useState } from "react";
import { Info, Search, TriangleAlert } from "lucide-react";
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
import type { WorkspaceData, WorkspaceView } from "./types";

export function DetailContent({
  view,
  data,
}: {
  view: WorkspaceView;
  data: WorkspaceData;
}) {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");

  if (view === "ambassadors") {
    const regions = [...new Set(data.ambassadors.map((p) => p.region))].sort();
    const filtered = data.ambassadors.filter(
      (person) =>
        `${person.name} ${person.region}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (region === "all" || person.region === region),
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
            {regions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <span className="self-center text-xs text-ink/60">{data.label}</span>
        </div>
        <Panel className="overflow-hidden p-0">
          <Table className="workspace-table">
            <TableHeader>
              <TableRow>
                {[
                  "Ambassador",
                  "Region",
                  "Referrals",
                  "Sign-up rate",
                  "Donations driven",
                  "Rewards earned",
                  "Last 6 months",
                ].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((person, i) => (
                <TableRow key={person.id}>
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
                    {person.signupRate}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {person.donations}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {person.rewards}
                  </TableCell>
                  <TableCell>
                    <LinePlot small tone="green" values={person.trend} />
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-ink/60"
                  >
                    {data.ambassadors.length
                      ? "No ambassadors match these filters."
                      : "No referral activity in this period."}
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
        <Panel
          title="Issued by source"
          aside={<span className="text-xs text-ink/60">{data.label}</span>}
        >
          {data.eiza.segments.length ? (
            <Donut
              size={180}
              total={data.eiza.total}
              caption="EIZA"
              segments={data.eiza.segments}
            />
          ) : (
            <p className="py-8 text-center text-xs text-ink/60">
              No EIZA issued in this period.
            </p>
          )}
        </Panel>
        <Panel
          title="Who holds EIZA"
          aside={<span className="text-xs text-ink/60">% of all balances</span>}
        >
          <Breakdown rows={data.holders.rows} />
          <CalloutBanner
            variant={data.holders.top100Share >= 50 ? "gold" : "neutral"}
            icon={
              data.holders.top100Share >= 50 ? (
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )
            }
            title={`The top 100 holders hold ${data.holders.top100Share}% of all EIZA.`}
            className="mt-4 border-0 text-xs leading-5 [&_p]:font-normal"
          />
        </Panel>
      </div>
    );

  const { userActivity } = data;
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
          <LinePlot
            values={userActivity.returning}
            secondary={userActivity.new}
            labels={userActivity.labels}
          />
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
              {data.cohorts.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="pr-10 text-left font-normal">
                    {row.label}
                  </th>
                  {row.values.map((value, j) =>
                    value === null ? (
                      <td key={j} />
                    ) : (
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
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
