"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { monotonePath } from "@/components/dashboard/curve";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSeries, DashboardSeriesKey } from "@/types/api";

/**
 * Manufacturers, products and contacts over the window, on shared axes.
 *
 * The lines are cumulative totals derived from `created_at`. Records that
 * arrived in a bulk import all carry that import's date, so the history reads
 * as a staircase rather than a slope — that is what the data says, and it
 * smooths out as records are added day to day.
 *
 * Note the three series differ by roughly forty to one in magnitude, so on one
 * axis the two smaller lines sit close to the baseline. The y-axis is labelled
 * at every gridline and the tooltip prints exact values, so a reader is never
 * left estimating from the line's height alone.
 */

const LINES: { key: DashboardSeriesKey; label: string; stroke: string }[] = [
  { key: "manufacturers", label: "Manufacturers", stroke: "var(--tile-green)" },
  { key: "products", label: "Products", stroke: "var(--tile-blue)" },
  { key: "contacts", label: "Contacts", stroke: "var(--tile-purple)" },
];

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 12 months" },
];

const PLOT = { width: 640, height: 260, left: 44, right: 8, top: 12, bottom: 28 };

export function BusinessOverview({
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
  const [hover, setHover] = useState<number | null>(null);

  const lines = LINES.map((line) => ({ ...line, entry: series?.get(line.key) }));
  const points = lines[0]?.entry?.points ?? [];
  const count = points.length;

  // One shared scale across all three series, so heights are comparable.
  const peak = Math.max(
    1,
    ...lines.flatMap((line) => line.entry?.points.map((p) => p.value) ?? [0]),
  );
  const ticks = niceTicks(peak);
  const ceiling = ticks[ticks.length - 1];

  const innerWidth = PLOT.width - PLOT.left - PLOT.right;
  const innerHeight = PLOT.height - PLOT.top - PLOT.bottom;
  const x = (index: number) =>
    PLOT.left + (index / Math.max(1, count - 1)) * innerWidth;
  const y = (value: number) =>
    PLOT.top + innerHeight - (value / ceiling) * innerHeight;

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          Business Overview
        </h2>

        <div className="relative shrink-0">
          <select
            value={windowDays}
            onChange={(event) => onWindowChange(Number(event.target.value))}
            aria-label="Time range"
            className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-8 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {RANGES.map((range) => (
              <option key={range.days} value={range.days}>
                {range.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2.5}
          />
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {lines.map((line) => (
          <li key={line.key} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: line.stroke }}
            />
            <span className="text-xs font-medium text-muted-foreground">
              {line.label}
            </span>
          </li>
        ))}
      </ul>

      {isPending || !series || count === 0 ? (
        <div className="mt-4 h-[260px] flex-1 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <div
          className={cn(
            "relative mt-3 flex-1 transition-opacity duration-200",
            isFetching && "opacity-60",
          )}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            // Map the pointer back through the plot's inner box, not the whole
            // element, or the index drifts by the axis gutter.
            const ratio =
              ((event.clientX - rect.left) / rect.width * PLOT.width - PLOT.left) /
              innerWidth;
            const index = Math.round(ratio * (count - 1));
            setHover(Math.max(0, Math.min(count - 1, index)));
          }}
        >
          <svg
            viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
            className="h-full w-full"
            role="img"
            aria-label="Cumulative manufacturers, products and contacts over the selected window"
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={PLOT.left}
                  y1={y(tick)}
                  x2={PLOT.width - PLOT.right}
                  y2={y(tick)}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={PLOT.left - 8}
                  y={y(tick) + 3.5}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {tick.toLocaleString()}
                </text>
              </g>
            ))}

            {lines.map((line) =>
              line.entry ? (
                <path
                  key={line.key}
                  d={monotonePath(
                    line.entry.points.map((point, index) => ({
                      x: x(index),
                      y: y(point.value),
                    })),
                  )}
                  fill="none"
                  stroke={line.stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null,
            )}

            {hover !== null && (
              <>
                <line
                  x1={x(hover)}
                  y1={PLOT.top}
                  x2={x(hover)}
                  y2={PLOT.top + innerHeight}
                  stroke="var(--muted-foreground)"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
                {lines.map((line) =>
                  line.entry ? (
                    // A ring in the surface colour keeps the marker readable
                    // where two lines cross.
                    <circle
                      key={line.key}
                      cx={x(hover)}
                      cy={y(line.entry.points[hover].value)}
                      r="4"
                      fill={line.stroke}
                      stroke="var(--card)"
                      strokeWidth="2"
                    />
                  ) : null,
                )}
              </>
            )}

            {axisDates(points.map((point) => point.date)).map(({ index, label }) => (
              <text
                key={index}
                x={x(index)}
                y={PLOT.height - 8}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            ))}
          </svg>

          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-xl border border-border bg-popover p-2.5 shadow-lg"
              style={{
                left: `${(x(hover) / PLOT.width) * 100}%`,
                transform:
                  hover > count / 2 ? "translateX(-108%)" : "translateX(8%)",
              }}
            >
              <p className="text-[11px] font-semibold text-foreground">
                {formatDay(points[hover].date)}
              </p>
              <ul className="mt-1.5 space-y-1">
                {lines.map((line) => (
                  <li
                    key={line.key}
                    className="flex items-center justify-between gap-3 text-[11px]"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: line.stroke }}
                      />
                      <span className="font-medium text-muted-foreground">
                        {line.label}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums text-foreground">
                      {line.entry?.points[hover].value.toLocaleString() ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Round gridlines: 5 steps ending on a 1/2/5 × 10ⁿ boundary above the peak. */
function niceTicks(peak: number): number[] {
  const rough = peak / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;
  const step =
    (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) *
    magnitude;
  const ticks: number[] = [];
  for (let value = 0; value <= peak + step / 2; value += step) ticks.push(value);
  return ticks;
}

/** Five evenly spaced x labels, however long the window is. */
function axisDates(dates: string[]): { index: number; label: string }[] {
  if (dates.length === 0) return [];
  const wanted = Math.min(5, dates.length);
  return Array.from({ length: wanted }, (_, slot) => {
    const index = Math.round((slot / Math.max(1, wanted - 1)) * (dates.length - 1));
    return { index, label: formatDay(dates[index]) };
  });
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
