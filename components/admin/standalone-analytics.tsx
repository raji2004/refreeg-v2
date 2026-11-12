"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import type {
  Period,
  WorkItem,
  WorkspaceData,
  WorkspaceView,
} from "./workspace/types";
import { csvText } from "@/lib/admin-workspace";
import { AnalyticsSidebar } from "./analytics-sidebar";
import "./workspace/workspace.css";

export function StandaloneAnalytics({ data }: { data: WorkspaceData }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [compare, setCompare] = useState(true);
  const [view, setView] = useState<WorkspaceView>("analytics");
  const [selected, setSelected] = useState<WorkItem | null>(null);
  const period = data.period;
  const heading = {
    analytics: "Analytics",
    ambassadors: "Ambassador performance",
    users: "User growth & retention",
    eiza: "EIZA coin distribution",
  }[view];
  const updated = new Date(data.generatedAt).toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

  function choosePeriod(value: Period) {
    if (value === period) return;
    startTransition(() => router.push(`${pathname}?period=${value}`));
  }

  function exportMetrics() {
    const rows = [
      ["Period", period],
      ["Range", data.label],
      ["Generated", data.generatedAt],
      ["Metric", "Value", "Change"],
      ...data.metrics.map((metric) => [
        metric.label,
        metric.value,
        metric.change ?? "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(["﻿", csvText(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `refreeg-analytics-${period}-${data.generatedAt.slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-workspace min-h-screen bg-cream text-ink lg:flex">
      <AnalyticsSidebar view={view} onView={setView} counts={data.navCounts} />
      <main className="mx-auto min-w-0 w-full max-w-[1440px] flex-1 space-y-6 px-4 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink/60">
              RefreeG · Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
            <p className="mt-2 text-sm text-ink/60">
              {data.label} · all figures in naira
            </p>
          </div>
          <Chip tone="green">Live · updated {updated} WAT</Chip>
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
                    disabled={pending}
                    onClick={() => choosePeriod(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              {period !== "day" && (
                <Button
                  variant={compare ? "ink" : "surface"}
                  aria-pressed={compare}
                  onClick={() => setCompare(!compare)}
                >
                  Compare to last period
                </Button>
              )}
              <Button variant="ink" className="gap-2" onClick={exportMetrics}>
                <ArrowDownToLine className="h-4 w-4" /> Export metrics
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
        <div
          aria-busy={pending}
          className={pending ? "pointer-events-none opacity-60" : undefined}
        >
          {view === "analytics" ? (
            <div className="space-y-6">
              <MetricCards metrics={data.metrics} loading={pending} />
              <div className="overflow-x-auto">
                <AnalyticsContent
                  data={data}
                  compare={compare}
                  onView={setView}
                  onSelect={setSelected}
                />
              </div>
            </div>
          ) : (
            <DetailContent key={view} view={view} data={data} />
          )}
        </div>
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
            <DialogDescription>Created by {selected?.detail}</DialogDescription>
          </DialogHeader>
          <p className="text-sm capitalize">Status: {selected?.status}</p>
          {selected?.href && (
            <a
              href={selected.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold underline"
            >
              Open campaign page
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
