"use client";

import {
  Boxes,
  Building2,
  FlaskConical,
  Package,
  TrendingUp,
  Atom,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";
import type { DashboardSeries, DashboardSeriesKey } from "@/types/api";

/**
 * The five headline tiles: the manufacturer total, then the catalogue total and
 * the three categories that partition it. Contacts is deliberately not a tile —
 * it still carries a line on the Business Overview chart.
 *
 * Count, growth and sparkline all come from `/dashboard/timeseries`, so a tile
 * cannot contradict its own curve — the series' last point *is* the count
 * (asserted in the backend's test_dashboard_timeseries). One request feeds the
 * whole row, and it follows the range selector rather than a fixed 30 days.
 */

type TileSpec = {
  key: DashboardSeriesKey;
  label: string;
  icon: LucideIcon;
  /** Tinted icon chip. */
  chip: string;
  /** Sparkline ink — each tile carries its own hue, as drawn. */
  ink: string;
  href: string;
};

const TILES: TileSpec[] = [
  {
    key: "manufacturers",
    label: "Total Manufacturers",
    icon: Building2,
    chip: "bg-tile-green-bg text-tile-green",
    ink: "text-tile-green",
    href: "/companies",
  },
  {
    key: "products",
    label: "Total Products",
    icon: Boxes,
    chip: "bg-tile-blue-bg text-tile-blue",
    ink: "text-tile-blue",
    href: "/products",
  },
  {
    key: "api",
    label: "API Products",
    icon: Atom,
    chip: "bg-tile-purple-bg text-tile-purple",
    ink: "text-tile-purple",
    href: "/products?material_type=api",
  },
  {
    key: "excipient",
    label: "Excipients",
    icon: FlaskConical,
    chip: "bg-tile-amber-bg text-tile-amber",
    ink: "text-tile-amber",
    href: "/products?material_type=excipient",
  },
  {
    key: "packaging_material",
    label: "Packaging Materials",
    icon: Package,
    chip: "bg-tile-teal-bg text-tile-teal",
    ink: "text-tile-teal",
    // Packaging is identified by a spec row, not a material_type, so it has
    // its own toggle rather than a value in the category picker (D14).
    href: "/products?is_packaging=true",
  },
];

export function KpiRow({
  series,
  windowDays,
  isPending,
}: {
  series: Map<DashboardSeriesKey, DashboardSeries> | null;
  windowDays: number;
  isPending: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
      {TILES.map((spec) =>
        isPending || !series ? (
          <div
            key={spec.key}
            className="h-[126px] animate-pulse rounded-2xl border border-border/60 bg-card sm:h-[142px]"
          />
        ) : (
          <KpiTile
            key={spec.key}
            spec={spec}
            entry={series.get(spec.key)}
            windowDays={windowDays}
          />
        ),
      )}
    </div>
  );
}

function KpiTile({
  spec,
  entry,
  windowDays,
}: {
  spec: TileSpec;
  entry: DashboardSeries | undefined;
  windowDays: number;
}) {
  const { icon: Icon } = spec;

  return (
    <Link
      href={spec.href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card pt-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:pt-4"
    >
      {/* Two tiles fit a 375px screen, so everything inside steps down a size
          there: the chip, the figure and the sparkline. */}
      <div className="flex items-start gap-2.5 px-3 sm:gap-3 sm:px-4">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 sm:size-11",
            spec.chip,
          )}
        >
          <Icon className="size-5 sm:size-[22px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-muted-foreground sm:text-[13px]">
            {spec.label}
          </span>
          <span className="mt-0.5 block text-[22px] font-bold leading-7 tracking-tight tabular-nums text-foreground sm:text-[26px] sm:leading-8">
            {(entry?.end_value ?? 0).toLocaleString()}
          </span>
        </span>
      </div>

      <div className="mt-1.5 px-3 sm:mt-2 sm:px-4">
        <Delta entry={entry} windowDays={windowDays} />
      </div>

      {entry && (
        <Sparkline
          points={entry.points}
          gradientId={`spark-${spec.key}`}
          className={cn("mt-2 h-8 w-full sm:h-10", spec.ink)}
        />
      )}
    </Link>
  );
}

/**
 * `change_pct` is null when the series was empty before the window opened —
 * everything it holds arrived inside it. That is a standing start, not "+100%
 * growth", so it is labelled rather than given an invented percentage. Every
 * series says this today because the catalogue was bulk-imported inside the
 * last month; the figures become real as records accrue day to day.
 */
function Delta({
  entry,
  windowDays,
}: {
  entry: DashboardSeries | undefined;
  windowDays: number;
}) {
  if (!entry) return null;

  const added = entry.end_value - entry.start_value;

  if (entry.change_pct === null) {
    return (
      <p className="truncate text-[11px] font-medium text-muted-foreground">
        {added > 0 ? `all ${added.toLocaleString()} added in window` : "no records yet"}
      </p>
    );
  }

  if (added === 0) {
    return (
      <p className="truncate text-[11px] font-medium text-muted-foreground">
        unchanged over {windowDays} days
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
      <TrendingUp className="size-3 shrink-0" strokeWidth={2.5} />
      <span className="tabular-nums">{entry.change_pct}%</span>
      <span className="truncate font-medium text-muted-foreground">
        vs last {windowDays} days
      </span>
    </p>
  );
}
