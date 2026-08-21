"use client";

import { ArrowDown, ArrowRight, ArrowUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenderStats } from "@/lib/queries";
import {
  DISPLAY_STATUS_CARD_ORDER,
  DISPLAY_STATUS_STYLES,
} from "./tender-status";
import type { TenderDisplayStatus, TenderStatBucket } from "@/types/api";

const CLOSING_SOON_WINDOW_DAYS = 15;

/**
 * The five stat tiles: total plus each display bucket. Every card's title,
 * number, and caption reserve the same height and the icon centers on the
 * number+caption pair rather than pinning to the card's top edge — the same
 * fix the Sourcing pipeline strip needed, for the same reason: a two-line
 * title must not push one card's number lower than its neighbours'.
 */
export function TenderStats({
  activeStatus,
  onStatusSelect,
  scope,
}: {
  activeStatus: TenderDisplayStatus | null;
  onStatusSelect: (status: TenderDisplayStatus | null) => void;
  scope?: "mine";
}) {
  const { data, isPending, error } = useTenderStats(scope);

  if (error) return null;

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-[168px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Total Tenders"
        icon={FileText}
        tile="bg-tile-blue-bg text-tile-blue ring-tile-blue/15"
        action="bg-secondary text-secondary-foreground hover:bg-secondary/70"
        bucket={data.total}
        active={false}
        onSelect={() => onStatusSelect(null)}
      />
      {DISPLAY_STATUS_CARD_ORDER.map((key) => {
        const style = DISPLAY_STATUS_STYLES[key];
        return (
          <StatCard
            key={key}
            label={style.label}
            icon={style.icon}
            tile={style.tile}
            action={style.badge}
            bucket={data[key]}
            caption={
              key === "closing_soon"
                ? `Due in next ${CLOSING_SOON_WINDOW_DAYS} days`
                : undefined
            }
            active={activeStatus === key}
            onSelect={() =>
              onStatusSelect(activeStatus === key ? null : key)
            }
          />
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  icon: Icon,
  tile,
  action,
  bucket,
  caption,
  active,
  onSelect,
}: {
  label: string;
  icon: typeof FileText;
  tile: string;
  action: string;
  bucket: TenderStatBucket;
  /** A fixed caption instead of the 30-day delta — Closing Soon's membership
   *  rotates by definition, so "vs last 30 days" would not mean anything. */
  caption?: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300",
        active
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/60 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <p
        title={label}
        className="line-clamp-2 min-h-[2.125rem] text-xs font-semibold leading-snug text-foreground"
      >
        {label}
      </p>

      <div className="flex flex-1 items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            tile,
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
            {bucket.count.toLocaleString()}
          </p>
          <DeltaOrCaption bucket={bucket} caption={caption} />
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "group mt-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          active ? "bg-primary text-primary-foreground" : action,
        )}
      >
        {active ? "Clear filter" : "View all"}
        <ArrowRight
          className="size-3 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2.5}
        />
      </button>
    </div>
  );
}

function DeltaOrCaption({
  bucket,
  caption,
}: {
  bucket: TenderStatBucket;
  caption?: string;
}) {
  if (caption) {
    return (
      <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
        {caption}
      </p>
    );
  }
  if (bucket.delta_pct === null) {
    return (
      <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
        vs last 30 days
      </p>
    );
  }
  const up = bucket.delta_pct >= 0;
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 truncate text-[11px] font-semibold",
        up ? "text-success" : "text-destructive",
      )}
    >
      {up ? (
        <ArrowUp className="size-3 shrink-0" strokeWidth={2.5} />
      ) : (
        <ArrowDown className="size-3 shrink-0" strokeWidth={2.5} />
      )}
      {Math.abs(bucket.delta_pct)}%
      <span className="font-medium text-muted-foreground">vs last 30d</span>
    </p>
  );
}
