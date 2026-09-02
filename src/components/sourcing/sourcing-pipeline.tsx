"use client";

import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, type StageKey } from "./sourcing-taxonomy";
import type { SourcingPipeline as Pipeline } from "@/types/api";

/**
 * Five pipeline counters across the top of the screen.
 *
 * They are filters, not decoration: the whole card is the button, because a
 * "View all" link inside a card the user has already aimed at is one more
 * thing to hit. Every stage renders at zero — one that vanished when it
 * emptied would make the pipeline look like it has fewer steps than it does.
 *
 * Kept deliberately short. There is one number per card, and a taller card
 * only buys whitespace above the fold that the table underneath needs more.
 *
 * The badge on Replied and Quotations is the part that earns the space. A
 * count of requests sitting in a status is history; a count of requests
 * waiting on *you* is work, and the two are not the same number.
 */
export function SourcingPipelineStrip({
  pipeline,
  isPending,
  activeStage,
  onStageSelect,
}: {
  pipeline: Pipeline | undefined;
  isPending: boolean;
  activeStage: StageKey | null;
  onStageSelect: (stage: StageKey | null) => void;
}) {
  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.key}
            className="h-[106px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </div>
    );
  }

  // The strip is context, not the page's payload — if the aggregate failed,
  // the table below is still perfectly usable, so render nothing rather than
  // an error the user cannot act on.
  if (!pipeline) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {PIPELINE_STAGES.map((stage) => (
        <StageCard
          key={stage.key}
          stage={stage}
          count={countFor(pipeline, stage.statuses)}
          badgeCount={awaitingFor(pipeline, stage.statuses)}
          active={activeStage === stage.key}
          onSelect={() =>
            onStageSelect(activeStage === stage.key ? null : stage.key)
          }
        />
      ))}
    </div>
  );
}

function StageCard({
  stage,
  count,
  badgeCount,
  active,
  onSelect,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  count: number;
  badgeCount: number;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = stage.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "group flex h-full w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left shadow-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/60 hover:-translate-y-0.5 hover:border-border hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            stage.tile,
          )}
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">
          {stage.label}
        </span>
        {/* The affordance the old card spent a whole bordered footer row on.
            An arrow that shifts on hover, becoming a dismiss once the filter
            is on, says the same thing in space the row already had. */}
        {active ? (
          <X className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
        ) : (
          <ArrowRight
            className="size-3.5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
            strokeWidth={2.5}
          />
        )}
      </div>

      {/* Count and caption share a line rather than stacking. With one number
          per card there was nothing to fill the height the stack cost. */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
          {count.toLocaleString()}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
          {stage.countLabel}
        </span>
        {/* Only when there is something outstanding. A permanent "0" badge
            would train the eye to ignore the one place it needs to look. The
            number is this stage's own column, so it is never larger than the
            count beside it. */}
        {stage.badge && badgeCount > 0 && (
          <span
            title={`${badgeCount} waiting on you`}
            className={cn(
              "flex size-[18px] shrink-0 items-center justify-center self-center rounded-full text-[10px] font-bold tabular-nums",
              stage.badge,
            )}
          >
            {badgeCount}
          </span>
        )}
      </div>
    </button>
  );
}

/** A stage could cover several statuses; today each covers exactly one, but
 *  the shape stays so reintroducing a grouped column is a data change. */
function countFor(pipeline: Pipeline, statuses: string[]): number {
  return pipeline.columns
    .filter((column) => statuses.includes(column.status))
    .reduce((total, column) => total + column.count, 0);
}

/** The same stage's "waiting on you" number. Summed over exactly the columns
 *  `countFor` sums, so the badge is a subset of the count by construction. */
function awaitingFor(pipeline: Pipeline, statuses: string[]): number {
  return pipeline.columns
    .filter((column) => statuses.includes(column.status))
    .reduce((total, column) => total + column.awaiting_us, 0);
}
