"use client";

import { ArrowDown, ArrowRight, ArrowUp, FileText, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTenderStats } from "@/lib/queries";
import {
  CLOSING_SOON_WINDOW_DAYS,
  DISPLAY_STATUS_CARD_ORDER,
  DISPLAY_STATUS_STYLES,
} from "./tender-status";
import type { TenderDisplayStatus, TenderStatBucket } from "@/types/api";

/**
 * Four stat tiles (total, open, closing soon, cancelled) plus a notice tile. Every card's title,
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
      <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] max-sm:[&>*]:w-40 max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
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
    // A swipeable row on a phone: five tiles in two columns would be three
    // tall rows ending on a hole, pushing the list a full screen down.
    <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] max-sm:[&>*]:w-40 max-sm:[&>*]:shrink-0 max-sm:[&>*]:snap-start sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden">
      <StatCard
        label="Total Tenders"
        icon={FileText}
        tile="bg-tile-blue/15 text-tile-blue ring-tile-blue/30"
        accent="bg-tile-blue"
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
            accent={style.accent}
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
      <NoticeCard />
    </div>
  );
}

/** The fifth tile: a plain-language note, in Bangla, on what this page
 *  lists — tenders confirmed from Tender Notices, or ones the buyer wants to
 *  bid on. Client's wording request, 2026-09-21. */
function NoticeCard() {
  return (
    <div
      lang="bn"
      className="relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-2xl border border-tile-amber/30 bg-tile-amber-bg p-4 shadow-sm max-sm:!w-64"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.75 bg-tile-amber" />
      <p className="flex items-center gap-1.5 text-xs font-semibold text-tile-amber">
        <Info className="size-4 shrink-0" strokeWidth={2.25} />
        নোটিশ
      </p>
      <p className="text-[13px] font-medium leading-relaxed text-foreground/85">
        এখানে শুধু সেই টেন্ডারগুলো দেখানো হচ্ছে, যেগুলো আপনি টেন্ডার নোটিশ থেকে কনফার্ম
        করেছেন অথবা যেগুলোতে আপনি অংশগ্রহণ করতে চান।
      </p>
    </div>
  );
}

function StatCard({
  label,
  icon: Icon,
  tile,
  accent,
  action,
  bucket,
  caption,
  active,
  onSelect,
}: {
  label: string;
  icon: typeof FileText;
  tile: string;
  /** Solid top-edge accent — the one place per card that carries the status
   *  colour at full strength rather than a tint. */
  accent: string;
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
        "relative flex h-full w-full flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300",
        active
          ? "border-primary/50 ring-1 ring-primary/30"
          : "border-border/60 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-0.75", accent)}
      />

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
