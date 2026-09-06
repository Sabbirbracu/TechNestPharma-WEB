"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TrendingUp } from "lucide-react";
import { monotonePath } from "@/components/dashboard/curve";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSeries, DashboardSeriesKey } from "@/types/api";

/**
 * How the catalogue and the supplier network grew over the window — all three
 * measures on one set of axes.
 *
 * Nothing shares the plot's row: the colour key and the scale switch sit in a
 * strip above it and the running totals live in the hover tooltip, so the lines
 * get the card's full width. That matters here — the card is only about five of
 * the dashboard's twelve grid columns.
 *
 * The three series are cumulative totals from `created_at`, and they are two
 * orders of magnitude apart: ~2,000 products against ~50 manufacturers and ~50
 * contacts. On a linear axis the two smaller lines lie flat on the baseline and
 * on top of each other, which is why this card used to be three separate panels.
 * A shared *log* axis is what lets them share a plane: it is one axis (never two
 * y-scales), it keeps real counts on the ticks, and it gives the small series
 * their own visible shape. The axis says "log" beside its top tick, because a
 * compressed axis left unlabelled would be read as linear.
 *
 * Colours come from the validated `--chart-*` slots, not the `--tile-*` badge
 * hues (see globals.css); every series is named in the legend, so identity never
 * rests on colour alone.
 *
 * Records that arrived in a bulk import all carry that import's date, so the
 * early history reads as a staircase rather than a slope — that is what the data
 * says, and it smooths out as records are added day to day.
 */

const SERIES: {
  key: DashboardSeriesKey;
  label: string;
  color: string;
}[] = [
  { key: "manufacturers", label: "Manufacturers", color: "var(--chart-1)" },
  { key: "products", label: "Products", color: "var(--chart-2)" },
  { key: "contacts", label: "Contacts", color: "var(--chart-3)" },
];

const RANGES = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" },
  { days: 365, label: "1y" },
];

/** Floor for the plot box; above this it grows with the card. */
const MIN_PLOT_HEIGHT = 220;
const PAD = { top: 12, right: 10, bottom: 26, left: 36 };

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
  // One hovered index for the whole plot: the crosshair reads the same day on
  // every line, and the legend turns into that day's values.
  const [hover, setHover] = useState<number | null>(null);
  const [plotRef, plot] = useMeasuredSize<HTMLDivElement>();

  const lines = useMemo(
    () =>
      SERIES.map((entry) => ({ ...entry, data: series?.get(entry.key) ?? null })).filter(
        (line): line is (typeof SERIES)[number] & { data: DashboardSeries } =>
          line.data !== null && line.data.points.length > 0,
      ),
    [series],
  );

  const points = lines[0]?.data.points ?? [];
  const count = points.length;
  const active = hover !== null && hover < count ? hover : null;

  const max = lines.reduce(
    (running, line) => Math.max(running, line.data.points[line.data.points.length - 1].value),
    0,
  );
  const y = useMemo(() => makeYScale(max), [max]);

  const innerWidth = Math.max(plot.width - PAD.left - PAD.right, 0);
  const innerHeight = Math.max(plot.height - PAD.top - PAD.bottom, 0);
  const xAt = (index: number) =>
    PAD.left + (count > 1 ? (index / (count - 1)) * innerWidth : innerWidth / 2);
  const yAt = (value: number) => PAD.top + (1 - y.fraction(value)) * innerHeight;

  const ready =
    !isPending && series !== null && lines.length > 0 && plot.width > 0 && plot.height > 0;

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TrendingUp className="size-4" strokeWidth={2.25} />
        </span>
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          Growth pulse
        </h2>
      </div>

      <p className="mt-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
        Cumulative totals on one shared axis
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
                "rounded-lg px-1 py-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                range.days === windowDays
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        <ul className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          {(isPending || !series ? SERIES : lines).map((line) => (
            <li key={line.key} className="flex items-center gap-1">
              <span
                aria-hidden
                className="h-[3px] w-2 shrink-0 rounded-full"
                style={{ background: line.color }}
              />
              <span className="text-[10px] font-semibold whitespace-nowrap text-foreground">
                {line.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={cn(
          "mt-5 flex flex-1 transition-opacity duration-200",
          isFetching && "opacity-60",
        )}
      >
        <div
          ref={plotRef}
          className="relative w-full min-w-0 flex-1"
          style={{ minHeight: MIN_PLOT_HEIGHT }}
          onMouseMove={(event) => {
            if (count < 1 || innerWidth <= 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - rect.left - PAD.left) / innerWidth;
            const index = Math.round(ratio * (count - 1));
            setHover(Math.max(0, Math.min(count - 1, index)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {!ready ? (
            <div className="size-full animate-pulse rounded-xl bg-secondary" />
          ) : (
            <svg
              width={plot.width}
              height={plot.height}
              viewBox={`0 0 ${plot.width} ${plot.height}`}
              role="img"
              aria-label={`Cumulative ${lines
                .map((line) => `${line.label} ${line.data.end_value.toLocaleString()}`)
                .join(", ")} over the last ${windowDays} days, log scale`}
            >
              {/* Grid and y ticks first, so every mark sits above them. */}
              {y.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    y1={yAt(tick)}
                    x2={plot.width - PAD.right}
                    y2={yAt(tick)}
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeDasharray={tick === 0 ? undefined : "3 4"}
                  />
                  <text
                    x={PAD.left - 8}
                    y={yAt(tick)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="var(--muted-foreground)"
                  >
                    {compact(tick)}
                  </text>
                </g>
              ))}

              {/* The axis is logarithmic and nothing else on the card says so. */}
              <text
                x={PAD.left - 8}
                y={PAD.top - 4}
                textAnchor="end"
                fontSize="9"
                fontWeight="600"
                letterSpacing="0.04em"
                fill="var(--muted-foreground)"
              >
                LOG
              </text>

              {/* y axis rule — the one solid vertical, so the plane reads as axes. */}
              <line
                x1={PAD.left}
                y1={PAD.top}
                x2={PAD.left}
                y2={plot.height - PAD.bottom}
                stroke="var(--border)"
                strokeWidth="1"
              />

              {xTicks(count, innerWidth).map((index) => (
                <text
                  key={index}
                  x={xAt(index)}
                  y={plot.height - PAD.bottom + 15}
                  textAnchor={
                    index === 0 ? "start" : index === count - 1 ? "end" : "middle"
                  }
                  fontSize="10"
                  fontWeight="500"
                  fill="var(--muted-foreground)"
                >
                  {formatDay(points[index].date)}
                </text>
              ))}

              {active !== null && (
                <line
                  x1={xAt(active)}
                  y1={PAD.top}
                  x2={xAt(active)}
                  y2={plot.height - PAD.bottom}
                  stroke="var(--foreground)"
                  strokeWidth="1"
                  strokeOpacity="0.28"
                />
              )}

              {lines.map((line) => (
                <path
                  key={line.key}
                  d={monotonePath(
                    line.data.points.map((point, index) => ({
                      x: xAt(index),
                      y: yAt(point.value),
                    })),
                  )}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Markers last. The 2px ring in the card colour keeps two dots
                  legible where the small series nearly coincide. */}
              {lines.map((line) => {
                const index = active ?? line.data.points.length - 1;
                const point = line.data.points[index];
                return (
                  <circle
                    key={line.key}
                    cx={xAt(index)}
                    cy={yAt(point.value)}
                    r="4"
                    fill={line.color}
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          )}

          {ready && active !== null && (
            <div
              className="pointer-events-none absolute top-2 w-[142px] rounded-lg border border-border/70 bg-popover/95 p-2 shadow-lg backdrop-blur-sm"
              style={{
                left: Math.min(
                  Math.max(xAt(active) + 12, PAD.left),
                  Math.max(plot.width - 150, PAD.left),
                ),
              }}
            >
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {formatDay(points[active].date)}
              </p>
              <ul className="mt-1.5 space-y-1">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-[3px] w-2.5 shrink-0 rounded-full"
                      style={{ background: line.color }}
                    />
                    <span className="truncate text-[10px] font-medium text-muted-foreground">
                      {line.label}
                    </span>
                    <span className="ml-auto text-[11px] font-bold tabular-nums text-foreground">
                      {line.data.points[active].value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** The plot is drawn in real pixels so its text and markers never stretch. */
function useMeasuredSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      // Bail out when nothing moved: this runs from an observer, and setting a
      // fresh object every time would re-render the whole chart on any resize
      // of anything.
      setSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };

    // Measure once up front rather than waiting on the observer: the first
    // callback is what the plot needs to render at all, and an environment that
    // delivers it late (or not at all) would otherwise leave the card stuck on
    // its loading skeleton. The observer only has to catch later changes.
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    // A window resize is not the same signal — the card is sized by the
    // dashboard grid — but it is the one moment a missed observation is most
    // visible, so re-measure then too.
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return [ref, size] as const;
}

/**
 * A y scale as a 0–1 fraction of the plot height, plus the tick values to print.
 *
 * The log branch transforms `value + 1` rather than `value`, so a series that is
 * still at zero early in the window lands on the baseline instead of at negative
 * infinity. Ticks are placed at the round decades (10, 100, 1,000) — their
 * transformed positions differ from a true log axis by well under a pixel, and
 * the labels stay readable.
 */
function makeYScale(max: number) {
  const project = (value: number) => Math.log10(Math.max(value, 0) + 1);
  const top = Math.max(project(max) * 1.06, 1);
  const fraction = (value: number) => project(value) / top;

  // Decades inside the range, then the top of the axis itself. Without that
  // last one the highest series runs above the highest labelled gridline and
  // the plot reads as cut off — 2,098 floating above a line marked "1k".
  const ticks: number[] = [0];
  for (let decade = 1; project(10 ** decade) <= top; decade += 1) {
    ticks.push(10 ** decade);
  }
  if (max > 0) {
    // Drop a decade the top label would sit on top of.
    while (ticks.length > 1 && fraction(max) - fraction(ticks[ticks.length - 1]) < 0.07) {
      ticks.pop();
    }
    ticks.push(max);
  }

  return { ticks, fraction };
}

/**
 * Evenly spaced day indices, always including both ends — three rather than four
 * once the plot is narrow enough that four "Aug 7"-sized labels would collide.
 */
function xTicks(count: number, plotWidth: number): number[] {
  if (count < 2) return count === 1 ? [0] : [];
  const wanted = Math.min(plotWidth < 260 ? 3 : 4, count);
  return Array.from({ length: wanted }, (_, i) =>
    Math.round((i * (count - 1)) / (wanted - 1)),
  );
}

function compact(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}k`;
  }
  return value.toLocaleString();
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
