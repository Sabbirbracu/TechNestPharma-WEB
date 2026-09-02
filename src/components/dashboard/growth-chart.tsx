"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSeries, DashboardSeriesKey } from "@/types/api";

/**
 * How the catalogue and the supplier network grew over the window.
 *
 * Drawn as small multiples — one panel per series, each with its own y-scale —
 * rather than three lines on shared axes. Products outnumber manufacturers
 * roughly forty to one, so a single scale would pin the two smaller series flat
 * against the baseline and show nothing; a second y-axis would be worse still.
 * Each panel prints its own end points, so a panel's scale can never be read as
 * another's.
 *
 * The lines are cumulative totals from `created_at`. Records that arrived in a
 * bulk import all carry that import's date, so the early history reads as a
 * staircase rather than a slope — that is what the data says, and it smooths
 * out as records are added day to day.
 */

const PANELS: { key: DashboardSeriesKey; label: string; href: string }[] = [
  { key: "manufacturers", label: "Manufacturers", href: "/companies" },
  { key: "products", label: "Products", href: "/products" },
  { key: "contacts", label: "Contacts", href: "/contacts" },
];

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

export function GrowthChart({
  series,
  windowDays,
  onWindowChange,
  isPending,
  isFetching,
}: {
  series: Map<DashboardSeriesKey, DashboardSeries> | null;
  windowDays: number;
  onWindowChange: (days: number) => void;
  isPending: boolean;
  isFetching: boolean;
}) {
  // One hovered index shared by every panel, so the crosshair reads the same
  // day across all three at once.
  const [hover, setHover] = useState<number | null>(null);

  const panels = PANELS.map((panel) => ({
    ...panel,
    entry: series?.get(panel.key),
  }));
  const length = panels[0]?.entry?.points.length ?? 0;

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Growth Overview
          </h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground sm:text-sm">
            Running totals, each panel on its own scale
          </p>
        </div>

        <div
          role="group"
          aria-label="Time range"
          className="flex shrink-0 items-center gap-0.5 rounded-xl bg-secondary p-0.5"
        >
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              onClick={() => onWindowChange(range.days)}
              aria-pressed={range.days === windowDays}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                range.days === windowDays
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "mt-5 flex-1 space-y-4 transition-opacity duration-200",
          isFetching && "opacity-60",
        )}
        onMouseLeave={() => setHover(null)}
      >
        {isPending || !series
          ? PANELS.map((panel) => (
              <div
                key={panel.key}
                className="h-[72px] animate-pulse rounded-xl bg-secondary"
              />
            ))
          : panels.map((panel) =>
              panel.entry ? (
                <Panel
                  key={panel.key}
                  label={panel.label}
                  entry={panel.entry}
                  hover={hover}
                  onHover={setHover}
                />
              ) : null,
            )}
      </div>

      {length > 0 && series && (
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          <span>{formatDay(panels[0].entry!.points[0].date)}</span>
          <span>{formatDay(panels[0].entry!.points[length - 1].date)}</span>
        </div>
      )}
    </Card>
  );
}

function Panel({
  label,
  entry,
  hover,
  onHover,
}: {
  label: string;
  entry: DashboardSeries;
  hover: number | null;
  onHover: (index: number | null) => void;
}) {
  const points = entry.points;
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const flat = high === low;
  const span = high - low || 1;

  const width = 100;
  const height = 40;
  const y = (value: number) =>
    flat ? height / 2 : height - ((value - low) / span) * (height - 6) - 3;
  const x = (index: number) => (index / (points.length - 1 || 1)) * width;

  const line = `M${points
    .map((point, index) => `${x(index).toFixed(2)},${y(point.value).toFixed(2)}`)
    .join("L")}`;
  const area = `${line}L${width},${height}L0,${height}Z`;

  const active = hover !== null && hover < points.length ? points[hover] : null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs font-semibold text-foreground">
          {label}
        </span>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {active ? (
            <>
              <span className="font-bold text-foreground">
                {active.value.toLocaleString()}
              </span>{" "}
              on {formatDay(active.date)}
            </>
          ) : (
            <>
              {low.toLocaleString()} → {high.toLocaleString()}
            </>
          )}
        </span>
      </div>

      <div
        className="relative mt-1.5 h-[52px] w-full"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - rect.left) / rect.width;
          const index = Math.round(ratio * (points.length - 1));
          onHover(Math.max(0, Math.min(points.length - 1, index)));
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible text-primary"
          role="img"
          aria-label={`${label}: ${low.toLocaleString()} to ${high.toLocaleString()} over the window`}
        >
          <defs>
            <linearGradient id={`growth-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={area} fill={`url(#growth-${entry.key})`} />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {active && hover !== null && (
            <>
              <line
                x1={x(hover)}
                y1="0"
                x2={x(hover)}
                y2={height}
                stroke="currentColor"
                strokeWidth="1"
                strokeOpacity="0.3"
                vectorEffect="non-scaling-stroke"
              />
              {/* A 2px ring in the surface colour keeps the marker readable
                  where it sits on top of the line. */}
              <circle
                cx={x(hover)}
                cy={y(active.value)}
                r="3.5"
                fill="currentColor"
                stroke="var(--card)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
