"use client";

import { FlaskConical, Package, Pill, Sparkles } from "lucide-react";
import { useProductStats } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ProductStatBucket } from "@/types/api";

const STAT_ICONS = {
  total: Sparkles,
  api: Pill,
  excipient: FlaskConical,
  packaging_material: Package,
  other: Sparkles,
} as const;

const STAT_COLORS = {
  total: "text-purple-600 bg-purple-100 ring-purple-600/20",
  api: "text-green-600 bg-green-100 ring-green-600/20",
  excipient: "text-orange-600 bg-orange-100 ring-orange-600/20",
  packaging_material: "text-blue-600 bg-blue-100 ring-blue-600/20",
  other: "text-indigo-600 bg-indigo-100 ring-indigo-600/20",
} as const;

/**
 * Product statistics cards showing total products and breakdown by category.
 * Displays count and trend for each category (APIs, Excipients, Packaging Materials, Other).
 */
export function ProductStatsCards() {
  const { data, isLoading, error } = useProductStats();

  if (error) {
    console.error("Product stats error:", error);
    return (
      <div className="rounded-xl border border-destructive/60 bg-destructive/5 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Sparkles className="size-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">
              Failed to load product statistics
            </p>
            <p className="text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Please check your connection and try again"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-6 w-16 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const buckets = data.buckets;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {buckets.map((bucket) => (
        <StatCard key={bucket.key} bucket={bucket} windowDays={data.window_days} />
      ))}
    </div>
  );
}

function StatCard({
  bucket,
  windowDays,
}: {
  bucket: ProductStatBucket;
  windowDays: number;
}) {
  const Icon = STAT_ICONS[bucket.key] ?? Sparkles;
  const colorClass = STAT_COLORS[bucket.key] ?? STAT_COLORS.other;

  const hasPositiveChange = bucket.change_pct !== null && bucket.change_pct > 0;
  const hasNegativeChange = bucket.change_pct !== null && bucket.change_pct < 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            colorClass,
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {bucket.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {bucket.count.toLocaleString()}
          </p>
          {bucket.change_pct !== null ? (
            <p
              className={cn(
                "mt-1.5 text-xs font-semibold",
                hasPositiveChange && "text-success",
                hasNegativeChange && "text-destructive",
                !hasPositiveChange && !hasNegativeChange && "text-muted-foreground",
              )}
            >
              {hasPositiveChange && "↑ "}
              {hasNegativeChange && "↓ "}
              {bucket.change_pct > 0 && "+"}
              {bucket.change_pct.toFixed(1)}% vs last {windowDays} days
            </p>
          ) : (
            <p className="mt-1.5 text-xs font-medium text-muted-foreground">
              No baseline
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
