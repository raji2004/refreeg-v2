export function csvText(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let cell = String(value);
          if (/^[=+@\-\t\r]/.test(cell)) cell = `'${cell}`;
          return `"${cell.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

function compact(value: number) {
  const abs = Math.abs(value);
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const scaled = value / size;
      return `${scaled.toFixed(1).replace(/\.0$/, "")}${suffix}`;
    }
  }
  return Math.round(value).toLocaleString("en-NG");
}

export function formatNaira(value: number, { exact = false } = {}) {
  if (exact) return `₦${Math.round(value).toLocaleString("en-NG")}`;
  return `₦${compact(value)}`;
}

export function formatCount(value: number, { short = false } = {}) {
  return short ? compact(value) : Math.round(value).toLocaleString("en-NG");
}

export function formatPercent(ratio: number) {
  if (!Number.isFinite(ratio)) return "—";
  const pct = ratio * 100;
  return `${pct.toFixed(pct > 0 && pct < 10 ? 1 : 0).replace(/\.0$/, "")}%`;
}

/** Relative change label, or undefined when there is no baseline to compare. */
export function formatChange(current: number, previous: number) {
  if (!previous) return undefined;
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? "+" : change < 0 ? "−" : "±";
  return {
    text: `${sign}${Math.abs(change).toFixed(1).replace(/\.0$/, "")}%`,
    negative: change < 0,
  };
}

/** Percentage-point difference between two ratios. */
export function formatPoints(current: number, previous: number) {
  const diff = (current - previous) * 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "±";
  return {
    text: `${sign}${Math.abs(diff).toFixed(1).replace(/\.0$/, "")} pts`,
    negative: diff < 0,
  };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}
