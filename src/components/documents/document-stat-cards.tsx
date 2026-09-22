"use client";

import { Calendar, Database, FileText, Tags, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentStats } from "@/types/api";

/**
 * The four-tile header strip.
 *
 * Each tile answers a different question, which is why none of them is a bare
 * count: how big is the library (and is it growing), how much room is left, how
 * much arrived this month, and how much of the type vocabulary is actually in
 * use. A row of four undifferentiated totals would take the same space and say
 * a quarter as much.
 */

/** Whole-percent growth, or null when there is no baseline to grow from.
 *
 *  A library that had nothing last month has not grown by 100% — it has simply
 *  started, and printing "+100%" against zero is the kind of number that makes
 *  a dashboard untrustworthy. Null renders as no delta at all. */
function growth(now: number, before: number): number | null {
  if (before <= 0) return null;
  return Math.round((now / before) * 100);
}

export function DocumentStatCards({
  stats,
  isPending,
}: {
  stats: DocumentStats | undefined;
  isPending: boolean;
}) {
  const total = stats?.total ?? 0;
  const addedThisMonth = stats?.added_this_month ?? 0;
  const quota = stats?.storage_quota_bytes ?? 0;
  const used = stats?.total_bytes ?? 0;
  const usedPercent = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;

  const totalDelta = growth(addedThisMonth, stats?.total_before_this_month ?? 0);
  const monthDelta =
    stats && stats.added_previous_month > 0
      ? Math.round(
          ((stats.added_this_month - stats.added_previous_month) /
            stats.added_previous_month) *
            100,
        )
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Tile
        icon={FileText}
        tint="bg-blue-50 text-blue-600 dark:bg-blue-500/12 dark:text-blue-300"
        label="Total Documents"
        value={isPending ? "—" : total.toLocaleString()}
        delta={totalDelta}
      />

      <Tile
        icon={Database}
        tint="bg-violet-50 text-violet-600 dark:bg-violet-500/12 dark:text-violet-300"
        label="Storage Used"
        value={isPending ? "—" : formatStorage(used)}
      >
        <div className="mt-2.5 space-y-1.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-blue-400"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p className="text-right text-[11px] font-medium text-muted-foreground">
            {isPending
              ? "—"
              : `${usedPercent < 1 && used > 0 ? "<1" : Math.round(usedPercent)}% of ${formatStorage(quota)}`}
          </p>
        </div>
      </Tile>

      <Tile
        icon={Calendar}
        tint="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300"
        label="Added This Month"
        value={isPending ? "—" : addedThisMonth.toLocaleString()}
        delta={monthDelta}
      />

      <Tile
        icon={Tags}
        tint="bg-teal-50 text-teal-600 dark:bg-teal-500/12 dark:text-teal-300"
        label="Document Types"
        value={isPending ? "—" : String(stats?.distinct_types ?? 0)}
        footnote="Different types"
      />
    </div>
  );
}

function Tile({
  icon: Icon,
  tint,
  label,
  value,
  delta,
  footnote,
  children,
}: {
  icon: typeof FileText;
  tint: string;
  label: string;
  value: string;
  delta?: number | null;
  footnote?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      {/* Two tiles to a row on a phone: the icon stacks above the label. */}
      <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:gap-3.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl sm:size-11",
            tint,
          )}
        >
          <Icon className="size-[18px] sm:size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-muted-foreground sm:text-[13px]">
            {label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[22px] leading-none font-bold tracking-tight tabular-nums text-foreground sm:text-[26px]">
              {value}
            </span>
            {delta !== undefined && delta !== null && (
              <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-3.5" strokeWidth={2.5} />
                {delta > 0 ? `+${delta}` : delta}%
              </span>
            )}
          </div>
          {delta !== undefined && delta !== null && (
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              vs last month
            </p>
          )}
          {footnote && (
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              {footnote}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

/** GB above a gigabyte, MB below — the storage meter reads in the unit the
 *  number is actually in, rather than 0.004 GB. */
function formatStorage(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  // A round quota reads as "20 GB"; a used figure keeps its tenth.
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
