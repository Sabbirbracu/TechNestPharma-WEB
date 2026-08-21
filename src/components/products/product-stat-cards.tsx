"use client";

import { Box, Boxes, Beaker, FlaskConical, Package, TrendingUp } from "lucide-react";
import { useProductStats } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ProductStatBucket } from "@/types/api";

/**
 * The five header tiles: the catalogue total plus its category breakdown.
 *
 * The four category tiles partition the catalogue, so they sum to the total —
 * see the backend's ProductService.stats for how a product with offers in two
 * categories gets assigned to exactly one.
 */

type TileStyle = { icon: typeof Box; tile: string };

// One hue per tile, matching the category colours the table rows carry.
const TILE_STYLES: Record<ProductStatBucket["key"], TileStyle> = {
  total: { icon: Box, tile: "bg-tile-green-bg text-tile-green ring-tile-green/15" },
  api: {
    icon: FlaskConical,
    tile: "bg-tile-green-bg text-tile-green ring-tile-green/15",
  },
  excipient: {
    icon: Beaker,
    tile: "bg-tile-amber-bg text-tile-amber ring-tile-amber/15",
  },
  packaging_material: {
    icon: Package,
    tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
  },
  other: {
    icon: Boxes,
    tile: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
  },
};

export function ProductStatCards() {
  const { data, isPending, error } = useProductStats();

  // The tiles are context, not the page's payload — if the aggregate fails the
  // table is still perfectly usable, so drop them rather than blocking on it.
  if (error) return null;

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="h-[104px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {data.buckets.map((bucket) => (
        <StatTile key={bucket.key} bucket={bucket} windowDays={data.window_days} />
      ))}
    </div>
  );
}

function StatTile({
  bucket,
  windowDays,
}: {
  bucket: ProductStatBucket;
  windowDays: number;
}) {
  const { icon: Icon, tile } = TILE_STYLES[bucket.key] ?? TILE_STYLES.other;

  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:gap-4 sm:p-5">
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105 sm:size-12",
          tile,
        )}
      >
        <Icon className="size-5 sm:size-[22px]" strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-muted-foreground sm:text-[13px]">
          {bucket.label}
        </p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-[28px] sm:leading-9">
          {bucket.count.toLocaleString()}
        </p>
        {/* Null means there was no baseline to compare against — a bucket that
            did not exist a window ago has no growth rate, and "+100%" would
            read as a real jump rather than a first entry. */}
        {bucket.change_pct !== null && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-success sm:text-xs">
            <TrendingUp className="size-3 shrink-0" strokeWidth={2.5} />
            <span className="tabular-nums">{bucket.change_pct}%</span>
            <span className="truncate font-medium text-muted-foreground">
              vs last {windowDays} days
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
