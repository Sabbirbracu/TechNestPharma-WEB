"use client";

import { useMemo, useState } from "react";
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
 * One number per card, and it is always the same unit: **enquiries whose
 * status is this stage**. The caption says so rather than naming what a reader
 * might assume — "New replies" and "Quotes received" were both wrong, and not
 * narrowly: 44 enquiries sat at Replied while only 2 had a reply on file, and
 * Quotations read 168 against 280 quotations actually stored.
 *
 * A "waiting on you" badge used to sit beside the count. It is gone because it
 * read as a second, contradicting count of the same thing — and because the
 * attention chips in the filter bar below already carry that number, next to
 * the control that filters by it. One place, one number.
 *
 * The counts are live. A supplier replying raises a `supplier_replied`
 * notification, the SSE stream invalidates every `sourcing` query, and this
 * strip refetches — Replied goes 44 → 45 with nobody touching the page. The
 * two-minute poll in the workspace is the backstop for an event that never
 * arrives, not the mechanism.
 *
 * The dot is what makes that visible. A number quietly incrementing in the
 * corner of a screen somebody is not looking at is the same as no update at
 * all, so a stage whose count has risen since this page was opened is marked
 * until it has been looked at.
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
  const counts = useMemo(
    () =>
      pipeline
        ? (Object.fromEntries(
            PIPELINE_STAGES.map((stage) => [
              stage.key,
              countFor(pipeline, stage.statuses),
            ]),
          ) as Record<StageKey, number>)
        : null,
    [pipeline],
  );

  // What the counts were when this page was opened, or when the reader last
  // acknowledged a stage. Anything above it is news.
  //
  // Seeded during render rather than in an effect: React documents this as the
  // way to adjust state when a prop changes, and an effect would paint one
  // frame with every stage looking unchanged before correcting itself.
  const [baseline, setBaseline] = useState<Record<StageKey, number> | null>(null);
  if (counts !== null && baseline === null) {
    setBaseline(counts);
  }

  // Derived, not stored. Keeping a second copy of "what is new" in state is how
  // it drifts out of step with the counts it describes.
  const risen = useMemo(() => {
    if (!counts || !baseline) return new Set<StageKey>();
    return new Set(
      PIPELINE_STAGES.filter(
        (stage) => counts[stage.key] > (baseline[stage.key] ?? counts[stage.key]),
      ).map((stage) => stage.key),
    );
  }, [counts, baseline]);

  // Looking at a stage is what clears it. Only that stage moves, so a reply
  // arriving on another one while this is clicked is not silently marked read.
  const acknowledge = (key: StageKey) => {
    if (!counts) return;
    setBaseline((previous) => ({ ...(previous ?? counts), [key]: counts[key] }));
  };

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
          count={counts?.[stage.key] ?? 0}
          hasNews={risen.has(stage.key)}
          active={activeStage === stage.key}
          onSelect={() => {
            acknowledge(stage.key);
            onStageSelect(activeStage === stage.key ? null : stage.key);
          }}
        />
      ))}
    </div>
  );
}

function StageCard({
  stage,
  count,
  hasNews,
  active,
  onSelect,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  count: number;
  /** This stage has grown since the page was opened, or since it was last
   *  clicked. */
  hasNews: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = stage.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={
        hasNews
          ? `${stage.label}: ${count} enquiries, some new since you opened this page`
          : `${stage.label}: ${count} enquiries`
      }
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
            "relative flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            stage.tile,
          )}
        >
          <Icon className="size-4" strokeWidth={2.25} />
          {/* On the tile rather than beside the number, so it reads as "this
              stage has something new" and never as a second count. The ping is
              a separate, non-animated dot underneath, so a reader with reduced
              motion still sees a solid mark. */}
          {hasNews && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-2.5"
            >
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/70 motion-reduce:hidden" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success ring-2 ring-card" />
            </span>
          )}
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
