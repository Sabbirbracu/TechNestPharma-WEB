"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSourcingPipeline } from "@/lib/queries";
import { PIPELINE_STAGES, type StageKey } from "./sourcing-taxonomy";
import type { SourcingPipeline as Pipeline } from "@/types/api";

/**
 * The pipeline strip: six stages a request moves through, left to right.
 *
 * The arrows between the cards are the point — this is a flow, not six
 * unrelated counters, and a buyer should be able to see where work is piling
 * up. Every stage renders even at zero; one that vanished when it emptied would
 * make the pipeline look like it has fewer steps than it does.
 */
export function SourcingPipelineStrip({
  activeStage,
  onStageSelect,
}: {
  activeStage: StageKey | null;
  onStageSelect: (stage: StageKey | null) => void;
}) {
  const { data, isPending, error } = useSourcingPipeline();

  // The strip is context, not the page's payload — if the aggregate fails the
  // table below is still perfectly usable.
  if (error) return null;

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.key}
            className="h-[136px] animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-0">
      {PIPELINE_STAGES.map((stage, index) => (
        <div key={stage.key} className="relative flex items-stretch xl:pr-6">
          <StageCard
            stage={stage}
            count={countFor(data, stage.statuses)}
            active={activeStage === stage.key}
            onSelect={() =>
              onStageSelect(activeStage === stage.key ? null : stage.key)
            }
          />
          {/* Connectors live between cards, so the last one has none. Hidden
              below xl, where the cards wrap and an arrow would point at the
              wrong neighbour. */}
          {index < PIPELINE_STAGES.length - 1 && (
            <span
              aria-hidden
              className="absolute right-0 top-1/2 hidden w-6 -translate-y-1/2 items-center justify-center text-muted-foreground/50 xl:flex"
            >
              <ArrowRight className="size-4" strokeWidth={2.25} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function StageCard({
  stage,
  count,
  active,
  onSelect,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  count: number;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = stage.icon;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300",
        active
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border/60 hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      {/* Fixed to a set number of lines so every card's icon/number row
          starts at the same y — "Draft" and "Sent / Awaiting Response" must
          not push the rest of the card to different heights. Three lines
          below `sm`, where the two-column grid leaves each card too narrow
          for the longest label to fit in two. */}
      <p
        title={stage.label}
        className="line-clamp-3 min-h-[3.25rem] text-xs font-semibold leading-snug text-foreground sm:line-clamp-2 sm:min-h-[2.125rem]"
      >
        {stage.label}
      </p>

      {/* The icon sits centered on the left against the number + caption —
          not pinned to the card's top edge — and this pairing centers as a
          unit in the space the (fixed-height) title leaves above the button. */}
      <div className="flex flex-1 items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            stage.tile,
          )}
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
            {count.toLocaleString()}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            {stage.countLabel}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          "group mt-auto flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          active
            ? "bg-primary text-primary-foreground"
            : stage.action,
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

/** A stage can cover several statuses — "Closed" is four of them. */
function countFor(pipeline: Pipeline, statuses: string[]): number {
  return pipeline.columns
    .filter((column) => statuses.includes(column.status))
    .reduce((total, column) => total + column.count, 0);
}
