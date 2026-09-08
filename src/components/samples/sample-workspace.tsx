"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Clock,
  FlaskConical,
  Loader2,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResultsPagination } from "@/components/search/results-pagination";
import { EmptyState } from "@/components/empty-state";
import { useDebounced } from "@/lib/use-debounced";
import { useDeleteSample, useSamplePipeline, useSamples } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { SAMPLE_TRANSITIONS } from "@/types/domain";
import type { SampleRequestListItem, SampleStage } from "@/types/api";
import type { SampleStatus } from "@/types/domain";
import {
  SAMPLE_STAGES,
  SAMPLE_STATUS_STYLES,
  STATUS_ACTION_LABEL,
  TEST_RESULT_STYLES,
  formatQuantity,
} from "./sample-taxonomy";
import { SampleCreateDialog } from "./sample-create-dialog";
import { SampleStatusDialog } from "./sample-status-dialog";

/**
 * The samples screen.
 *
 * Built as a chase list rather than a register, because the failure this
 * feature exists to prevent is a sample going quiet: nobody chased it, so
 * nobody tested it, so the enquiry behind it stalled and no screen said so.
 * Three things follow from that.
 *
 * **Overdue is the headline.** A promised date that has passed is the only
 * number on this page that means "do something today", so it gets its own
 * chip, sorts to the top server-side, and is the one filter reachable in a
 * click.
 *
 * **Every row offers its next move as a button, not a menu.** A sample almost
 * always has exactly one sensible next step — a requested one gets promised, a
 * shipped one gets received — and making somebody open a dropdown of eight
 * states to find the obvious one is how status fields go stale. The rarer
 * moves (cancel, reject early) stay in the overflow.
 *
 * **The board groups eight states into five.** `promised` and `shipped` are
 * how far a chase has got, not a different place the parcel sits, so they
 * appear on the row instead of as columns nobody scans.
 */
const PAGE_SIZE = 20;

export function SampleWorkspace() {
  const [stage, setStage] = useState<SampleStage | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [creating, setCreating] = useState(false);
  const search = useDebounced(draft.trim());

  function narrow(apply: () => void) {
    apply();
    setPage(1);
  }

  const pipeline = useSamplePipeline();
  const query = useSamples({
    page,
    size: pageSize,
    ...(search ? { q: search } : {}),
    ...(stage ? { stage } : {}),
    ...(overdueOnly ? { overdue: true } : {}),
  });

  const samples = query.data?.items ?? [];
  const narrowed = Boolean(search) || stage !== null || overdueOnly;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tile-purple-bg text-tile-purple ring-1 ring-inset ring-tile-purple/15 sm:size-12">
            <FlaskConical className="size-5 sm:size-[22px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Samples
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Every parcel from request to result, with the chase in one place.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0">
          <Plus />
          New sample request
        </Button>
      </div>

      {/* The board. Five milestones; the late count rides on the stage where
          the sample is still in somebody else's hands. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {SAMPLE_STAGES.map((entry) => {
          const data = pipeline.data?.stages.find((s) => s.stage === entry.key);
          const active = stage === entry.key;
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              type="button"
              aria-pressed={active}
              onClick={() =>
                narrow(() => setStage(active ? null : entry.key))
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
                    "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                    entry.tile,
                  )}
                >
                  <Icon className="size-4" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">
                  {entry.label}
                </span>
                {active ? (
                  <X className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                ) : (
                  <ArrowRight
                    className="size-3.5 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                    strokeWidth={2.5}
                  />
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
                  {(data?.count ?? 0).toLocaleString()}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
                  {entry.caption}
                </span>
                {(data?.overdue ?? 0) > 0 && (
                  <span
                    title={`${data?.overdue} past the promised date`}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive"
                  >
                    <Clock className="size-2.5" strokeWidth={2.6} />
                    {data?.overdue}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter bar. The overdue chip is a filter, not a statistic — the whole
          point of surfacing the number is being able to act on it. */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={draft}
            onChange={(event) => narrow(() => setDraft(event.target.value))}
            placeholder="Search product, supplier, purpose or tracking…"
            aria-label="Search samples"
            className="h-10 rounded-xl pl-10 text-sm font-normal"
          />
        </div>

        {(pipeline.data?.overdue ?? 0) > 0 && (
          <button
            type="button"
            aria-pressed={overdueOnly}
            onClick={() => narrow(() => setOverdueOnly((value) => !value))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold ring-1 ring-inset transition-colors",
              overdueOnly
                ? "bg-destructive text-destructive-foreground ring-destructive"
                : "bg-destructive/10 text-destructive ring-destructive/20 hover:bg-destructive/15",
            )}
          >
            <TriangleAlert className="size-3.5" strokeWidth={2.4} />
            {pipeline.data?.overdue} overdue
          </button>
        )}

        {(pipeline.data?.awaiting_result ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-tile-purple-bg px-3 py-2 text-[13px] font-bold text-tile-purple ring-1 ring-inset ring-tile-purple/20">
            <FlaskConical className="size-3.5" strokeWidth={2.4} />
            {pipeline.data?.awaiting_result} in the lab
          </span>
        )}

        {narrowed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              narrow(() => {
                setStage(null);
                setOverdueOnly(false);
                setDraft("");
              })
            }
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {query.error ? (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-12 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="size-4" />
          Samples could not be loaded.
        </div>
      ) : query.isPending ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-16 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading samples…
        </div>
      ) : samples.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={narrowed ? "Nothing matches that" : "No sample requests yet"}
          description={
            narrowed
              ? "Clear the filters to see every sample."
              : "Ask a supplier for a sample and it appears here, from request through testing to a result."
          }
        >
          {!narrowed && (
            <Button onClick={() => setCreating(true)}>
              <Plus />
              New sample request
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2.5">
            {samples.map((sample) => (
              <SampleRow key={sample.id} sample={sample} />
            ))}
          </ul>

          {query.data && (
            <ResultsPagination
              page={query.data.page}
              pageCount={query.data.pages}
              total={query.data.total}
              pageSize={query.data.size}
              itemLabel="samples"
              onPageChange={setPage}
              onPageSizeChange={(size) => narrow(() => setPageSize(size))}
            />
          )}
        </div>
      )}

      {creating && <SampleCreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

/** The next move worth putting on a button.
 *
 *  Cancel is never it: it is always legal and almost never what you meant, so
 *  it lives in the overflow where a mis-click cannot reach it. */
function primaryNext(status: SampleStatus): SampleStatus | null {
  const legal = SAMPLE_TRANSITIONS[status].filter((next) => next !== "cancelled");
  // Under test has two equally valid answers — approve or reject — and
  // guessing one would put the wrong verb on the button.
  if (status === "under_test") return null;
  return legal[0] ?? null;
}

function SampleRow({ sample }: { sample: SampleRequestListItem }) {
  const [moving, setMoving] = useState<SampleStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteSample();

  const style = SAMPLE_STATUS_STYLES[sample.status];
  const next = primaryNext(sample.status);
  const others = SAMPLE_TRANSITIONS[sample.status].filter((s) => s !== next);
  const quantity = formatQuantity(sample.quantity_value, sample.quantity_unit);

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm transition-colors",
        sample.is_overdue
          ? "border-destructive/30 hover:border-destructive/50"
          : "border-border/60 hover:border-border",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {sample.product?.name_en ?? "Unnamed product"}
            </span>
            {sample.product?.cas_number && (
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {sample.product.cas_number}
              </span>
            )}
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                style.badge,
              )}
            >
              {style.label}
            </span>
            {sample.test_result && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                  TEST_RESULT_STYLES[sample.test_result].badge,
                )}
              >
                {TEST_RESULT_STYLES[sample.test_result].label}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-[13px] font-medium text-muted-foreground">
            {sample.company?.name_en ?? "Unknown supplier"}
            {quantity ? ` · ${quantity}` : ""}
            {sample.purpose ? ` · ${sample.purpose}` : ""}
          </p>

          {/* The chase detail. This is where `promised` and `shipped` live
              instead of being board columns. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
            <span>Asked {formatDay(sample.requested_on)}</span>
            {sample.promised_on && (
              <span
                className={cn(
                  sample.is_overdue && "font-bold text-destructive",
                )}
              >
                {sample.is_overdue ? "Was due " : "Due "}
                {formatDay(sample.promised_on)}
              </span>
            )}
            {sample.tracking_no && (
              <span>
                {sample.courier ? `${sample.courier} ` : ""}
                {sample.tracking_no}
              </span>
            )}
            {sample.received_on && <span>Arrived {formatDay(sample.received_on)}</span>}
            {!sample.received_on && sample.age_days > 0 && (
              <span>{sample.age_days}d open</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {next && (
            <Button size="sm" onClick={() => setMoving(next)}>
              {STATUS_ACTION_LABEL[next]}
            </Button>
          )}
          {sample.status === "under_test" && (
            <>
              <Button size="sm" onClick={() => setMoving("approved")}>
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMoving("rejected")}
              >
                Reject
              </Button>
            </>
          )}

          {(others.length > 0 || true) && (
            <DropdownMenu
              trigger={(props) => (
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="More actions"
                  {...props}
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              )}
            >
              {(close) => (
                <>
                  {others.length > 0 && (
                    <>
                      <DropdownMenuLabel>Move to</DropdownMenuLabel>
                      {others.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          destructive={status === "cancelled" || status === "rejected"}
                          onClick={() => {
                            close();
                            setMoving(status);
                          }}
                        >
                          {STATUS_ACTION_LABEL[status]}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    destructive
                    onClick={() => {
                      close();
                      setConfirming(true);
                    }}
                  >
                    <Trash2 />
                    Delete request
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenu>
          )}
        </div>
      </div>

      {moving && (
        <SampleStatusDialog
          sample={sample}
          target={moving}
          onClose={() => setMoving(null)}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title="Delete this sample request?"
          description={
            <>
              The request for{" "}
              <span className="font-semibold text-foreground">
                {sample.product?.name_en ?? "this product"}
              </span>{" "}
              and its whole status history will be removed. Cancel it instead if
              it was real and did not go ahead — that keeps the record.
            </>
          }
          confirmLabel="Delete"
          busy={remove.isPending}
          onConfirm={() =>
            remove.mutate(sample.id, {
              onSuccess: () => toast.success("Sample request deleted."),
              onError: () => toast.error("Could not delete it."),
              onSettled: () => setConfirming(false),
            })
          }
          onCancel={() => setConfirming(false)}
        />
      )}
    </li>
  );
}

function formatDay(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
