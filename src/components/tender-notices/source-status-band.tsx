"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useFetchNoticeSource, useNoticeSources } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { NoticeFetchReport, NoticeSource } from "@/types/api";
import { HookFetchStage, type HookFetchOutcome } from "./hook-fetch-stage";

/** One short line for the end of the animation; the toast carries the detail. */
function resultLine(report: NoticeFetchReport | undefined): string {
  if (!report) return "";
  const created = report.notices_created;
  return created > 0
    ? `${created} new notice${created === 1 ? "" : "s"} reeled in.`
    : "Checked — nothing new today.";
}

/** "2 hours ago", "3 days ago" — coarse on purpose.
 *
 *  The band answers "is the fetcher alive", and to the minute is more
 *  precision than that question has. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Whether the scheduled fetchers are actually working.
 *
 * Fetching is scheduled rather than driven from this screen (client decision
 * 2026-09-03) — the whole point is that nobody has to remember to go and look
 * at edcl.gov.bd. But that makes failure invisible: a broken scraper produces
 * no new notices, and for weeks at a time neither does a working one. There is
 * nothing on the page to distinguish them.
 *
 * So the band is small and quiet while things work — one line saying when each
 * source last ran — and loud when one has failed, carrying the error and the
 * retry beside it. A notification already rang at the moment of failure; this
 * is where somebody who dismissed it, or joined later, can still see it.
 *
 * Sources with `adapter: "manual"` are omitted: nothing fetches them, so
 * "last checked never" would be a permanent false alarm.
 */
export function SourceStatusBand() {
  const { user } = useAuth();
  const { data: sources } = useNoticeSources();

  const automated = (sources ?? []).filter(
    (source) => source.adapter !== "manual" && source.is_enabled,
  );
  if (automated.length === 0) return null;

  return (
    <div className="space-y-2">
      {automated.map((source) => (
        <SourceRow
          key={source.id}
          source={source}
          canRetry={user?.role === "owner"}
        />
      ))}
    </div>
  );
}

export function SourceRow({
  source,
  canRetry,
}: {
  source: NoticeSource;
  canRetry: boolean;
}) {
  const fetchNow = useFetchNoticeSource();
  const failed = Boolean(source.last_error);
  // Whether the hook animation is on stage. Outlives the request on purpose —
  // the request's own result (toast, refreshed list) never waits for it.
  const [performing, setPerforming] = useState(false);

  const outcome: HookFetchOutcome = fetchNow.isError
    ? "error"
    : fetchNow.isSuccess
      ? "success"
      : "pending";

  const run = () => {
    // Reduced motion: the plain spinner button, and nothing else.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) setPerforming(true);
    fetchNow.mutate(source.id, {
      onSuccess: (report) => {
        // The skip counts are the interesting part of a successful run: "12
        // rows, nothing new" is the healthy answer most of the time, and
        // reporting only "0 imported" would read as a failure.
        const created = report.notices_created;
        toast.success(
          created > 0
            ? `${created} new notice${created === 1 ? "" : "s"} from ${report.source_name}.`
            : `${report.source_name} checked — ${report.rows_seen} rows, nothing new.`,
          { duration: 5000 },
        );
      },
      onError: (error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "That fetch did not run.",
          { duration: 6000 },
        );
      },
    });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border px-3.5 py-2.5",
        failed
          ? "border-destructive/30 bg-destructive/5"
          : "border-border/60 bg-secondary/30",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          failed
            ? "bg-destructive/10 text-destructive"
            : "bg-tile-green-bg text-tile-green",
        )}
      >
        {failed ? (
          <AlertTriangle className="size-4" strokeWidth={2.25} />
        ) : (
          <CheckCircle2 className="size-4" strokeWidth={2.25} />
        )}
      </span>

      {/* The min width makes the button wrap under the text on a phone,
          rather than squeezing it into a narrow column. */}
      <div className="min-w-48 flex-1">
        <p className="text-xs font-bold text-foreground">
          {source.name}
          <span className="ml-1.5 font-medium text-muted-foreground">
            {source.last_fetched_at
              ? `checked ${relativeTime(source.last_fetched_at)}`
              : "not checked yet"}
          </span>
        </p>
        {failed ? (
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-destructive">
            {source.last_error}{" "}
            <span className="font-bold">
              Please contact your developer to diagnose.
            </span>
          </p>
        ) : (
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
            New notices are collected automatically and read on arrival.
          </p>
        )}
      </div>

      {canRetry && (
        <Button
          type="button"
          size="sm"
          onClick={run}
          disabled={fetchNow.isPending || performing}
          aria-busy={fetchNow.isPending}
          className={cn(
            // ml-10 = the icon (size-7) + gap-3, so a wrapped button lines up
            // under the text.
            "ml-10 shadow-md transition-shadow sm:ml-0",
            failed
              ? "shadow-destructive/20"
              : "shadow-primary/25 ring-2 ring-primary/20 hover:shadow-lg hover:ring-primary/35",
          )}
        >
          {fetchNow.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Checking…
            </>
          ) : performing ? (
            fetchNow.isError ? (
              <>
                <AlertTriangle className="size-3.5" strokeWidth={2.25} />
                Failed
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" strokeWidth={2.25} />
                Checked
              </>
            )
          ) : (
            <>
              <RefreshCw className="size-3.5" strokeWidth={2.25} />
              {failed ? "Try again" : "Check now"}
            </>
          )}
        </Button>
      )}

      {performing && (
        <HookFetchStage
          outcome={outcome}
          title={`Checking ${source.name}`}
          padLabel={source.name}
          resultCaption={
            fetchNow.isError ? "The line snapped. Try again in a moment." : resultLine(fetchNow.data)
          }
          onDone={() => setPerforming(false)}
        />
      )}
    </div>
  );
}
