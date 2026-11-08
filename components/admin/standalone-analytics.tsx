"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnalyticsContent } from "./workspace/analytics";
import { DetailContent } from "./workspace/details";
import { Chip, MetricCards } from "./workspace/primitives";
import { analyticsMetrics } from "./workspace/sample-data";
import type { Period, WorkItem, WorkspaceView } from "./workspace/types";
import { csvText } from "@/lib/admin-workspace";
import { AnalyticsSidebar } from "./analytics-sidebar";
import "./workspace/workspace.css";

// This screen owns only local UI state. A future container can pass reporting
// data into AnalyticsContent; no server actions or query hooks are needed here.
export function StandaloneAnalytics() {
  const [period, setPeriod] = useState<Period>("month");
  const [compare, setCompare] = useState(true);
  const [view, setView] = useState<WorkspaceView>("analytics");
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const heading = {
    analytics: "Analytics",
    ambassadors: "Ambassador performance",
    users: "User growth & retention",
    eiza: "EIZA coin distribution",
  }[view];

  function exportMetrics() {
    const rows = [
      ["Source", "Sample data"],
      ["Period", period],
      ["Metric", "Value", "Change"],
      ...analyticsMetrics[period].map((metric) => [
        metric.label,
        metric.value,
        metric.change ?? "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csvText(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `refreeg-analytics-${period}-sample.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-workspace min-h-screen bg-cream text-ink lg:flex">
      <AnalyticsSidebar view={view} onView={setView} />
      <main className="mx-auto min-w-0 w-full max-w-[1440px] flex-1 space-y-6 px-4 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">
              RefreeG · Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-2 text-sm text-ink/60">
              October 2026 demo · all figures in naira
            </p>
          </div>
          <Chip tone="neutral">UI preview · sample data</Chip>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          {view === "analytics" ? (
            <>
              <div
                role="group"
                aria-label="Reporting period"
                className="flex rounded-xl bg-surface p-1"
              >
                {(["day", "month", "year"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={period === value ? "ink" : "ghost"}
                    className="rounded-lg capitalize"
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <Button
                variant="surface"
                aria-pressed={compare}
                onClick={() => setCompare(!compare)}
              >
                {compare ? "Compare to last period" : "Show comparison"}
              </Button>
              <Button variant="ink" className="gap-2" onClick={exportMetrics}>
                <ArrowDownToLine className="h-4 w-4" /> Export sample metrics
              </Button>
            </>
          ) : (
            <Button
              variant="surface"
              className="gap-2"
              onClick={() => setView("analytics")}
            >
              <ArrowLeft className="h-4 w-4" /> Back to analytics
            </Button>
          )}
        </div>
        {view === "analytics" ? (
          <>
            <MetricCards metrics={analyticsMetrics[period]} />
            <div className="overflow-x-auto">
              <AnalyticsContent
                period={period}
                compare={compare}
                onView={setView}
                onSelect={setSelected}
              />
            </div>
          </>
        ) : (
          <DetailContent key={view} view={view} query="" period={period} />
        )}
      </main>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="bg-surface text-ink">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.detail}</DialogDescription>
          </DialogHeader>
          <p className="text-sm">Sample campaign · {selected?.status}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
