"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "./types";

const strokeClasses = {
  blue: "stroke-blue-accent",
  green: "stroke-forest",
  neutral: "stroke-ink/40",
  red: "stroke-rust",
  gold: "stroke-gold",
};
export function LinePlot({
  values,
  previous,
  secondary,
  area = false,
  small = false,
  tone = "blue",
  labels,
}: {
  values: number[];
  previous?: number[];
  secondary?: number[];
  area?: boolean;
  small?: boolean;
  tone?: Tone;
  labels?: string[];
}) {
  const chartId = useId();
  const max =
    Math.max(...values, ...(previous ?? []), ...(secondary ?? []), 1) * 1.12;
  const height = small ? 32 : 210;
  const points = (list: number[]) =>
    list
      .map(
        (v, i) =>
          `${list.length === 1 ? 500 : (i / (list.length - 1)) * 1000},${height - (v / max) * (height - 12)}`,
      )
      .join(" ");
  return (
    <div className={cn("min-w-0", small && "w-[90px]")}>
      <svg
        viewBox={`0 0 1000 ${height}`}
        preserveAspectRatio="none"
        className={cn(
          "block w-full overflow-visible",
          small ? "h-7" : "h-[210px]",
        )}
        role="img"
        aria-labelledby={chartId}
      >
        <title id={chartId}>
          {`${small ? "Trend" : "Donation trend"}: ${values
            .map(
              (v, i) => `${labels?.[i] ?? i + 1}: ${v.toLocaleString("en-NG")}`,
            )
            .join(", ")}`}
        </title>
        {!small &&
          !area &&
          [0.25, 0.55, 0.85].map((y) => (
            <line
              key={y}
              x1="0"
              x2="1000"
              y1={height * y}
              y2={height * y}
              className="stroke-hairline/60"
              strokeWidth="1"
            />
          ))}
        {area && (
          <polygon
            points={`0,${height} ${points(values)} 1000,${height}`}
            className="fill-blue-accent/[0.08]"
          />
        )}
        {secondary && (
          <polyline
            points={points(secondary)}
            fill="none"
            className="stroke-forest"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {previous && (
          <polyline
            points={points(previous)}
            fill="none"
            className="stroke-ink/40"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={points(values)}
          fill="none"
          className={strokeClasses[tone]}
          strokeWidth={small ? 1.8 : 2.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {labels && (
        <div className="mt-6 flex justify-between text-xs text-ink/60">
          {labels.map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
export function BarPlot({
  values,
  labels,
  className,
  lastTone = "blue",
}: {
  values: number[];
  labels?: string[];
  className?: string;
  lastTone?: "blue" | "green";
}) {
  const max = Math.max(...values, 1);
  return (
    <div>
      <div
        className={cn("flex h-[180px] items-end gap-1.5", className)}
        role="img"
        aria-label={values
          .map((v, i) => `${labels?.[i] ?? i + 1}: ${v}`)
          .join(", ")}
      >
        {values.map((value, i) => (
          <div
            key={i}
            title={`${labels?.[i] ?? i + 1}: ${value}`}
            className={cn(
              "min-w-0 flex-1 rounded-t-[5px]",
              i === values.length - 1
                ? lastTone === "green"
                  ? "bg-forest"
                  : "bg-blue-accent"
                : "bg-blue-accent/15",
            )}
            style={{ height: `${Math.max((value / max) * 100, 1)}%` }}
          />
        ))}
      </div>
      {labels && (
        <div className="mt-3 flex justify-between text-xs text-ink/60">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
const segmentColors = [
  "bg-blue-accent",
  "bg-gold",
  "bg-forest",
  "bg-ink/40",
  "bg-rust",
];
export function Donut({
  segments,
  total,
  caption,
  size = 150,
  tones,
}: {
  segments: { label: string; value: number; display: string }[];
  total?: string;
  caption?: string;
  size?: number;
  tones?: Tone[];
}) {
  const id = useId();
  const sum = segments.reduce((s, v) => s + v.value, 0) || 1;
  let offset = 0;
  const defaultStrokes = [
    "stroke-blue-accent",
    "stroke-gold",
    "stroke-forest",
    "stroke-ink/40",
    "stroke-rust",
  ];
  const strokes = tones?.map((tone) => strokeClasses[tone]) ?? defaultStrokes;
  const fills: Record<Tone, string> = {
    blue: "bg-blue-accent",
    green: "bg-forest",
    gold: "bg-gold",
    neutral: "bg-ink/40",
    red: "bg-rust",
  };
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="h-full w-full -rotate-90"
          role="img"
          aria-labelledby={id}
        >
          <title id={id}>
            {segments.map((s) => `${s.label}: ${s.display}`).join(", ")}
          </title>
          {segments.map((segment, i) => {
            const length = (segment.value / sum) * 100;
            const start = offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                cx="50"
                cy="50"
                r="43"
                fill="none"
                strokeWidth="13"
                pathLength="100"
                strokeDasharray={`${Math.max(0, length - 0.4)} ${100 - length + 0.4}`}
                strokeDashoffset={-start}
                className={strokes[i % strokes.length]}
              />
            );
          })}
        </svg>
        {total && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-xl tracking-tight">{total}</strong>
            <span className="mt-1 text-xs text-ink/60">{caption}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {segments.map((segment, i) => (
          <div key={segment.label} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-[3px]",
                tones
                  ? fills[tones[i % tones.length]]
                  : segmentColors[i % segmentColors.length],
              )}
            />
            <span className="whitespace-nowrap">{segment.label}</span>
            <strong className="ml-auto whitespace-nowrap">
              {segment.display}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
export function Breakdown({
  rows,
}: {
  rows: { label: string; value: number; tone: Tone }[];
}) {
  const fills = {
    blue: "bg-blue-accent",
    green: "bg-forest",
    red: "bg-rust",
    gold: "bg-gold",
    neutral: "bg-ink/40",
  };
  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <div className="flex items-center gap-3 text-xs" key={row.label}>
          <span className="w-[30%] shrink-0">{row.label}</span>
          <div
            role="meter"
            aria-label={row.label}
            aria-valuenow={row.value}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.07]"
          >
            <div
              style={{ width: `${row.value}%` }}
              className={cn("h-full rounded-full", fills[row.tone])}
            />
          </div>
          <strong className="w-7 text-right">{row.value}%</strong>
        </div>
      ))}
    </div>
  );
}
