"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ApiError } from "@/lib/api";
import {
  useFetchNoticeSource,
  useNoticeSources,
  useUpdateNoticeSchedule,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { SettingsCard } from "./settings-workspace";
import type { NoticeSource } from "@/types/api";

/**
 * When the tender sites get scraped.
 *
 * Fetching is scheduled rather than driven from a screen (client decision
 * 2026-09-03) — the whole point is that nobody has to remember to go and look
 * at edcl.gov.bd. But "scheduled" used to mean a six-hour interval baked into
 * an environment variable, which drifts with every restart and cannot answer
 * the only question anyone actually asks: *when does it check next?*
 *
 * So the schedule is a clock now (2026-09-05). Pick how many times a day —
 * once, twice, three times — and pick the times. Once at 10:00 is the default
 * and, for a site that publishes a handful of notices a week against closing
 * dates a fortnight out, is very likely the right answer forever.
 *
 * One section per automated source. There is exactly one today (EDCL), and
 * rendering it per source rather than as a single global setting is what stops
 * the second site from needing this screen rewritten.
 */
export function ScrapeSchedulerCard() {
  const { data: sources, isPending } = useNoticeSources();

  // Upload-only sources are excluded, not disabled: nothing fetches them, so
  // a schedule on one would be a control that does nothing.
  const automated = (sources ?? []).filter((source) => source.adapter !== "manual");

  if (isPending) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-6 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Loading sources…
      </div>
    );
  }

  if (automated.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No automated sources"
        description="Nothing here scrapes a website yet — every notice is uploaded by hand, so there is no schedule to set."
      />
    );
  }

  return (
    <>
      {automated.map((source) => (
        <SourceSchedule
          // The saved schedule is part of the key, so a source whose stored
          // values change — after a save, or when somebody else edits it —
          // remounts with those values as the form's starting point. That
          // replaces a re-seeding effect, which React now flags as a cascading
          // render, and it is safe here precisely because these values only
          // ever change on a save: a background refetch that changed nothing
          // keeps the same key and never interrupts typing.
          key={`${source.id}:${source.is_enabled}:${source.schedule_times.join(",")}`}
          source={source}
        />
      ))}
    </>
  );
}

/** The three times a day offered, in the order they are filled in.
 *
 *  Morning first because it is the default; the later two are spread across
 *  the working day rather than bunched, so that raising the frequency actually
 *  shortens the worst-case wait for a new notice instead of just adding a
 *  second look at the same listing. */
const DEFAULT_TIMES = ["10:00", "15:00", "20:00"];

const RUN_LABEL: Record<number, string> = {
  1: "Once a day",
  2: "Twice a day",
  3: "Three times a day",
};

function SourceSchedule({ source }: { source: NoticeSource }) {
  const stored = source.schedule_times.length ? source.schedule_times : ["10:00"];

  const [enabled, setEnabled] = useState(source.is_enabled);
  const [times, setTimes] = useState<string[]>(stored);
  const save = useUpdateNoticeSchedule();
  const fetchNow = useFetchNoticeSource();

  const dirty =
    enabled !== source.is_enabled ||
    times.join(",") !== stored.join(",");

  /** Changing "how many times a day" keeps the times already chosen and fills
   *  the rest from the defaults, so going 1 → 3 → 1 does not silently discard
   *  a time the user typed. */
  function setRunCount(count: number) {
    setTimes((current) =>
      Array.from(
        { length: count },
        (_, index) => current[index] ?? DEFAULT_TIMES[index] ?? "10:00",
      ),
    );
  }

  function setTimeAt(index: number, value: string) {
    setTimes((current) =>
      current.map((time, position) => (position === index ? value : time)),
    );
  }

  // Caught here as well as server-side, because the browser's own time input
  // reports an empty string rather than an error when it is cleared, and a
  // duplicate is a schedule that quietly runs fewer times than it claims.
  const blank = times.some((time) => !time);
  const duplicated = new Set(times).size !== times.length;

  async function submit() {
    try {
      await save.mutateAsync({
        sourceId: source.id,
        is_enabled: enabled,
        schedule_times: times,
      });
      toast.success(
        enabled
          ? `${source.name} will be scraped ${describe(times)}`
          : `Scheduled scraping turned off for ${source.name}`,
        { duration: 5000 },
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the schedule",
      );
    }
  }

  async function runNow() {
    try {
      const report = await fetchNow.mutateAsync(source.id);
      toast.success(
        report.notices_created > 0
          ? `${report.notices_created} new notice${report.notices_created === 1 ? "" : "s"} from ${source.name}`
          : `${source.name} checked — ${report.rows_seen} listing row${report.rows_seen === 1 ? "" : "s"}, nothing new`,
        { duration: 6000 },
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not reach the site",
      );
    }
  }

  return (
    <SettingsCard
      icon={CalendarClock}
      title={`${source.name} — scraping schedule`}
      description={
        source.base_url ?? source.full_name ?? "Automated tender notice fetch"
      }
    >
      <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-3">
        <Checkbox
          className="mt-0.5"
          checked={enabled}
          onChange={() => setEnabled((value) => !value)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">
            Scrape this site automatically
          </span>
          <span className="block text-xs font-medium text-muted-foreground">
            Turned off, notices from {source.name} only arrive when someone
            uploads the PDF by hand.
          </span>
        </span>
      </label>

      {/* Kept mounted but dimmed rather than unmounted when scraping is off:
          the times are still the saved schedule, and hiding them makes the
          toggle look destructive. */}
      <div
        className={cn(
          "space-y-4 transition-opacity",
          !enabled && "pointer-events-none opacity-50",
        )}
        aria-disabled={!enabled}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How often">
            <Select
              value={times.length}
              disabled={!enabled}
              onChange={(event) => setRunCount(Number(event.target.value))}
            >
              {[1, 2, 3].map((count) => (
                <option key={count} value={count}>
                  {RUN_LABEL[count]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Timezone">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-input bg-secondary/40 px-4 text-sm font-medium text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              <span className="truncate">{source.schedule_timezone}</span>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {times.map((time, index) => (
            <Field
              // Index is the identity here: these are positional slots on a
              // fixed-length list, and keying by value would remount the input
              // being typed into on every keystroke.
              key={index}
              label={times.length === 1 ? "Time of day" : `Run ${index + 1}`}
            >
              <Input
                type="time"
                value={time}
                disabled={!enabled}
                onChange={(event) => setTimeAt(index, event.target.value)}
              />
            </Field>
          ))}
        </div>

        {duplicated && (
          <Notice tone="warning">
            Two runs are set to the same time, so the site would only be checked
            once. Move one of them.
          </Notice>
        )}
        {blank && (
          <Notice tone="warning">Every run needs a time.</Notice>
        )}
      </div>

      <StatusLine source={source} />

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={runNow}
          disabled={fetchNow.isPending}
        >
          {fetchNow.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          Scrape now
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={!dirty || blank || duplicated || save.isPending}
        >
          {save.isPending && <Loader2 className="animate-spin" />}
          Save schedule
        </Button>
      </div>
    </SettingsCard>
  );
}

/**
 * What the schedule is doing right now, in one line.
 *
 * The failure half is the reason this is here rather than only on the notices
 * list. A scraper that breaks produces no new notices — and so does a working
 * one during a quiet fortnight — so the two are indistinguishable unless
 * something says which happened. The error is shown next to the controls that
 * caused it, with "Scrape now" beside it as the retry.
 */
function StatusLine({ source }: { source: NoticeSource }) {
  if (source.last_error) {
    return (
      <Notice tone="error">
        <span className="block font-bold">Last scrape failed</span>
        <span className="block break-words">{source.last_error}</span>
      </Notice>
    );
  }

  if (!source.is_enabled) {
    return (
      <Notice tone="muted">
        Automatic scraping is off. Nothing will be fetched until it is turned
        back on.
      </Notice>
    );
  }

  return (
    <Notice tone="ok">
      {source.next_run_at
        ? `Next scrape ${formatWhen(source.next_run_at, source.schedule_timezone)}.`
        : "Next scrape not scheduled."}
      {source.last_fetched_at
        ? ` Last checked ${formatWhen(source.last_fetched_at, source.schedule_timezone)}.`
        : " Not checked yet."}
    </Notice>
  );
}

/** "today at 15:00", "tomorrow at 10:00", "on 12 Sep at 10:00".
 *
 *  Rendered in the source's own timezone rather than the browser's: the times
 *  above are typed in that zone, and a status line that answered in a
 *  different one would look like the schedule had not saved. */
function formatWhen(iso: string, timeZone: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "—";

  const day = (value: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(when);

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const yesterday = new Date(now.getTime() - 86_400_000);

  if (day(when) === day(now)) return `today at ${clock}`;
  if (day(when) === day(tomorrow)) return `tomorrow at ${clock}`;
  if (day(when) === day(yesterday)) return `yesterday at ${clock}`;

  return `on ${new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(when)} at ${clock}`;
}

/** "once a day at 10:00", "twice a day at 10:00 and 15:00" — for the toast,
 *  which is the only confirmation that the times went in as typed. */
function describe(times: string[]): string {
  const sorted = [...times].sort();
  const list =
    sorted.length === 1
      ? sorted[0]
      : `${sorted.slice(0, -1).join(", ")} and ${sorted[sorted.length - 1]}`;
  const frequency =
    sorted.length === 1
      ? "once a day"
      : sorted.length === 2
        ? "twice a day"
        : `${sorted.length} times a day`;
  return `${frequency} at ${list}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "ok" | "warning" | "error" | "muted";
  children: React.ReactNode;
}) {
  const style = {
    ok: {
      wrap: "border-border/60 bg-secondary/40 text-muted-foreground",
      icon: CheckCircle2,
      ink: "text-success",
    },
    warning: {
      wrap: "border-warning/30 bg-warning/10 text-warning-foreground",
      icon: AlertTriangle,
      ink: "text-warning-foreground",
    },
    error: {
      wrap: "border-destructive/30 bg-destructive/10 text-destructive",
      icon: AlertTriangle,
      ink: "text-destructive",
    },
    muted: {
      wrap: "border-border/60 bg-secondary/40 text-muted-foreground",
      icon: Clock,
      ink: "text-muted-foreground",
    },
  }[tone];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium",
        style.wrap,
      )}
    >
      <Icon className={cn("mt-px size-3.5 shrink-0", style.ink)} strokeWidth={2.5} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
