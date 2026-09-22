import Link from "next/link";
import { CalendarDays, ChevronRight, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { NOTICE_STATUS_LABEL, NOTICE_STATUS_STYLE, formatDate } from "./notice-taxonomy";
import type { TenderNoticeListItem } from "@/types/api";

/** How long a freshly captured notice wears the NEW badge. */
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;

/** The moment the notice reached us — the fetcher's detection time for a
 *  scraped notice, the upload time for a hand-uploaded one. */
function capturedAt(notice: TenderNoticeListItem): string {
  return notice.detected_at ?? notice.created_at;
}

/** Sort key for "Published". `notice_date` is a bare date (the notice prints
 *  no hour), so the capture time breaks ties between same-day notices. */
export function publishedSortKey(notice: TenderNoticeListItem): string {
  return `${notice.notice_date ?? capturedAt(notice).slice(0, 10)}|${capturedAt(notice)}`;
}

export function isNewNotice(notice: TenderNoticeListItem): boolean {
  const at = new Date(capturedAt(notice)).getTime();
  return !Number.isNaN(at) && Date.now() - at < NEW_WINDOW_MS;
}

function formatClock(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function mappedProgress(notice: TenderNoticeListItem): number {
  return notice.item_count > 0
    ? Math.round((notice.mapped_count / notice.item_count) * 100)
    : 0;
}

function StatusPill({ notice }: { notice: TenderNoticeListItem }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ring-inset",
        NOTICE_STATUS_STYLE[notice.status],
      )}
    >
      {NOTICE_STATUS_LABEL[notice.status]}
    </span>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-primary ring-1 ring-inset ring-primary/25">
      NEW
    </span>
  );
}

function Published({ notice }: { notice: TenderNoticeListItem }) {
  const time = formatClock(capturedAt(notice));
  return (
    <div className="flex items-start gap-2.5">
      <CalendarDays
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
      />
      <div className="leading-tight">
        <p className="text-[11px] font-medium text-muted-foreground">Published</p>
        <p className="mt-0.5 whitespace-nowrap text-[13px] font-semibold text-foreground">
          {formatDate(notice.notice_date ?? capturedAt(notice))}
        </p>
        {time && (
          <p className="mt-0.5 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
            {time}
          </p>
        )}
      </div>
    </div>
  );
}

function Mapped({
  notice,
  compact = false,
}: {
  notice: TenderNoticeListItem;
  /** The desktop list column: tighter type and a short, thin bar, so the
   *  title column keeps the width. */
  compact?: boolean;
}) {
  const progress = mappedProgress(notice);
  return (
    <div className="leading-tight">
      <p className="text-[11px] font-medium text-muted-foreground">Mapped</p>
      <p
        className={cn(
          "mt-0.5 whitespace-nowrap font-semibold tabular-nums text-foreground",
          compact ? "text-xs" : "text-[13px]",
        )}
      >
        {notice.mapped_count}/{notice.item_count} items
      </p>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-foreground/10",
          compact ? "mt-1 h-1 w-14" : "mt-1.5 h-1.5",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            progress === 100 ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Source · the site's own tender number(s) · tender count. The item count is
 *  deliberately NOT here: items belong to a tender, not to the notice, and the
 *  Mapped column already says how many lines are settled. */
function MetaLine({ notice }: { notice: TenderNoticeListItem }) {
  const parts = [
    notice.source_name ?? "Unknown source",
    notice.source_refs.length > 0
      ? `Tender No: ${notice.source_refs.join(", ")}`
      : null,
    notice.tender_count > 0
      ? `${notice.tender_count} Tender${notice.tender_count === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <p className="mt-1 break-words text-xs font-medium text-muted-foreground">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1.5 text-border sm:mx-2">|</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

function NoticeIcon({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/[0.07] text-primary ring-1 ring-inset ring-primary/10", className)}>
      <FileText className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/** Row container shared styling — highlighted when ticked or freshly captured. */
function rowTone(selected: boolean, fresh: boolean): string {
  if (selected) return "border-primary/50 bg-primary/[0.05]";
  if (fresh) return "border-primary/30 bg-primary/[0.03] hover:border-primary/50";
  return "border-border/60 bg-card hover:border-primary/40 hover:shadow-sm";
}

export function NoticeRow({
  notice,
  selected,
  onToggle,
}: {
  notice: TenderNoticeListItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const fresh = isNewNotice(notice);

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-2xl border pl-3.5 transition sm:items-center sm:gap-4 sm:pl-5",
        rowTone(selected, fresh),
      )}
    >
      {/* Outside the link, or ticking a row would navigate away from it.
          On a phone it pins to the title's first line instead of centring
          against a tall, wrapped row. */}
      <div className="pt-4 sm:pt-0">
        <Checkbox
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${notice.title}`}
        />
      </div>

      <Link
        href={`/tender-notices/${notice.id}`}
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-3.5 pr-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:py-4 sm:pr-5 lg:grid-cols-[auto_minmax(0,1fr)_8.5rem_7.5rem_5.5rem_auto] lg:gap-x-4"
      >
        {/* The icon is decoration; on a phone its 48px go to the title. */}
        <NoticeIcon className="hidden sm:flex" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="break-words text-sm font-bold leading-snug text-foreground sm:text-[15px]">
              {notice.title}
            </span>
            {fresh && <NewBadge />}
          </div>
          <MetaLine notice={notice} />
        </div>

        <div className="hidden lg:block">
          <Published notice={notice} />
        </div>
        <div className="hidden lg:block">
          <StatusPill notice={notice} />
        </div>
        <div className="hidden lg:block">
          <Mapped notice={notice} compact />
        </div>

        <ChevronRight className="size-5 shrink-0 self-start text-muted-foreground sm:self-center" />

        {/* Below lg the three columns fold under the title instead: a
            date / status line, and the mapped bar at full width beneath it
            on a phone, where there's no room to sit them side by side. */}
        <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-t border-border/60 pt-3 sm:col-span-3 sm:flex sm:flex-wrap sm:gap-x-6 sm:border-0 sm:pl-[4.25rem] sm:pt-0 lg:hidden">
          <Published notice={notice} />
          <StatusPill notice={notice} />
          <div className="col-span-2 sm:w-28">
            <Mapped notice={notice} />
          </div>
        </div>
      </Link>
    </li>
  );
}

/** The grid-view counterpart of `NoticeRow`. */
export function NoticeCard({
  notice,
  selected,
  onToggle,
}: {
  notice: TenderNoticeListItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const fresh = isNewNotice(notice);

  return (
    <li
      className={cn(
        "relative flex flex-col rounded-2xl border transition",
        rowTone(selected, fresh),
      )}
    >
      <div className="absolute left-4 top-4 z-10">
        <Checkbox
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${notice.title}`}
        />
      </div>

      <Link
        href={`/tender-notices/${notice.id}`}
        className="flex flex-1 flex-col gap-4 p-4 pl-12"
      >
        <div className="flex items-start justify-between gap-3">
          <NoticeIcon />
          <div className="flex items-center gap-2">
            {fresh && <NewBadge />}
            <StatusPill notice={notice} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-foreground">
            {notice.title}
          </p>
          <MetaLine notice={notice} />
        </div>

        <div className="grid grid-cols-2 items-end gap-4 border-t border-border/60 pt-3">
          <Published notice={notice} />
          <Mapped notice={notice} />
        </div>
      </Link>
    </li>
  );
}
