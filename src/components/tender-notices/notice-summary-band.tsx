import {
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCheck,
  FileStack,
  FileText,
  Hash,
  Clock,
  ScanLine,
  Tags,
} from "lucide-react";
import { closingLabel } from "@/components/tenders/tender-status";
import type { ClosingLevel } from "@/components/tenders/tender-status";
import { cn } from "@/lib/utils";
import { formatDate, formatFileSize } from "./notice-taxonomy";
import type { Readiness } from "./notice-readiness";
import type { TenderNoticeDetail } from "@/types/api";

/**
 * What the source site said this notice is, and one line on whether it can go
 * live.
 *
 * The band used to carry six *derived* figures — requirement lines, mapping
 * progress, schedule cost, shortlisted suppliers. Every one of those is
 * already stated, in more detail, by the panel directly underneath: the tender
 * table shows the lines and their mapping state per tender, and the cost sits
 * on the tender row it belongs to. Restating them up here as totals answered a
 * question nobody was asking and pushed the one thing you cannot get anywhere
 * else off the top of the screen.
 *
 * So the band was cut to what identifies the notice (2026-09-05), and every
 * card except the first now comes from the *site listing* rather than from
 * OCR:
 *
 *     Tenders      how many tenders are inside this one document
 *     দরপত্র নং      the site's own tender number(s), verbatim
 *     Tender type  the `দরপত্রের ধরণ` column — International / National
 *     Closing      the nearest deadline still ahead
 *     Tender PDF   opens the document itself
 *
 * That provenance is the point of the middle two. The reference numbers inside
 * the scan have to be read by OCR off a page with no text layer, which is the
 * weakest link in this pipeline; the same numbers on the listing are real text.
 * Showing the listing's version means the header states a fact rather than a
 * guess — and the cross-check callout above already reports it when the two
 * disagree.
 */
export function SummaryBand({
  notice,
  readiness,
  onOpenDocument,
}: {
  notice: TenderNoticeDetail;
  readiness: Readiness;
  /** Switches the panel below to the document tab. The PDF card is a button,
   *  not a link: the viewer is already on this page, and opening a new tab
   *  would lose the tender table beside it. */
  onOpenDocument?: () => void;
}) {
  const tenders = notice.tenders;
  const liveCount = tenders.filter(
    (t) => t.notice_confirmed_at !== null,
  ).length;

  // The nearest deadline the buyer is actually working against: the earliest
  // date still ahead, falling back to the last one that passed when they all
  // have. ISO dates sort correctly as plain strings.
  const closingDates = tenders
    .map((tender) => tender.closing_date)
    .filter((date): date is string => Boolean(date))
    .sort();
  const today = new Date().toISOString().slice(0, 10);
  const nearestClosing =
    closingDates.find((date) => date >= today) ??
    closingDates[closingDates.length - 1] ??
    null;
  const countdown = closingLabel(nearestClosing);
  const alarm = CLOSING_ALARMS[countdown?.level ?? "calm"];

  const refs = tenderNumbers(notice);
  const type = tenderType(notice);
  // `original_filename` is set whenever a document was stored, and is the
  // only file field the list schema carries — a notice created by hand has
  // none, and its PDF card must say so rather than open an empty viewer.
  const hasDocument = Boolean(notice.original_filename);

  return (
    <section className="space-y-3">
      {/* Five cards, and the last one spans the gap at the two-column width so
          the row never ends on a hole. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Tile
          label="Tenders"
          value={String(notice.tender_count)}
          hint={
            notice.tender_count === 0
              ? "nothing extracted yet"
              : liveCount > 0
                ? `${liveCount} live · ${notice.tender_count - liveCount} draft`
                : "in this one notice"
          }
          icon={FileStack}
          hue="blue"
        />

        <Tile
          label="দরপত্র নং / Tender No"
          value={refs.value}
          hint={refs.hint}
          // One EDCL notice routinely carries six tender numbers, and this is
          // the card they belong on — so it wraps rather than truncating.
          // Cutting "10, 11, 12, 13, 14, 15" off at "10, 11, 12, 1…" would
          // fail on precisely the notices the card exists for.
          wrap
          title={refs.title}
          icon={Hash}
          hue="purple"
        />

        <Tile
          label="Tender Type"
          value={type.value}
          hint={type.hint}
          icon={Tags}
          hue="teal"
        />

        <Tile
          label="Closing Date"
          value={formatDate(nearestClosing)}
          hint={countdown?.text ?? "no closing date read"}
          icon={CalendarClock}
          // A deadline on the clock is the one figure here that asks for
          // action, so it drops the calm amber for the alarm hue and states
          // the countdown as a badge rather than a caption.
          hue={alarm.hue}
          ring={alarm.ring}
          alert={countdown ? { ...alarm, text: countdown.text } : undefined}
        />

        <Tile
          className="sm:col-span-2 xl:col-span-1"
          label="Tender PDF"
          value={hasDocument ? "View PDF" : "No file"}
          hint={
            hasDocument
              ? [
                  formatFileSize(notice.file_size_bytes),
                  notice.page_count ? `${notice.page_count} page(s)` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "open the scan"
              : "this notice was entered by hand"
          }
          icon={FileText}
          hue="rose"
          onClick={hasDocument ? onOpenDocument : undefined}
        />
      </div>

      {/* Only when it says something the reader cannot already see. "Ready to
          confirm" restates an enabled button; "no reference number on 3
          tenders" explains a disabled one, which is the whole reason this
          strip exists. */}
      {(readiness.kind === "blocked" || readiness.kind === "empty") && (
        <ReadinessStrip readiness={readiness} />
      )}
    </section>
  );
}

/**
 * The `দরপত্র নং` cell(s), preferring the site listing over the document.
 *
 * One EDCL notice is commonly six listing rows — one per tender inside the
 * scan — so this is usually a list, not a single number. The listing text is
 * exact; the tender's own `reference_no` came out of OCR and is the fallback
 * for a notice that was uploaded by hand and has no listing behind it.
 */
function tenderNumbers(notice: TenderNoticeDetail): {
  value: string;
  hint: string;
  title?: string;
} {
  const fromListing = unique(
    notice.listing_rows.map((row) => row.source_ref?.trim()),
  );
  if (fromListing.length > 0) {
    return {
      value: fromListing.join(", "),
      hint:
        fromListing.length === 1
          ? "as published on the site"
          : `${fromListing.length} on the site listing`,
      title: fromListing.join(", "),
    };
  }

  const fromTenders = unique(
    notice.tenders.map((tender) => tender.reference_no?.trim()),
  );
  if (fromTenders.length > 0) {
    return {
      value: fromTenders.join(", "),
      hint:
        fromTenders.length === 1
          ? "read from the document"
          : `${fromTenders.length} read from the document`,
      title: fromTenders.join(", "),
    };
  }

  return { value: "—", hint: "no tender number found" };
}

/**
 * The `দরপত্রের ধরণ` column — International / National.
 *
 * `notice.notice_type` is copied from the listing at fetch time and is the
 * authority; the listing rows are the same value and are checked only for a
 * notice recorded before that column existed.
 */
function tenderType(notice: TenderNoticeDetail): { value: string; hint: string } {
  const fromNotice = notice.notice_type?.trim();
  if (fromNotice) return { value: fromNotice, hint: "from the site listing" };

  const fromRows = unique(notice.listing_rows.map((row) => row.notice_type?.trim()));
  if (fromRows.length > 0) {
    return { value: fromRows.join(" · "), hint: "from the site listing" };
  }

  return { value: "—", hint: "not stated on the listing" };
}

/** Non-empty values, in the order they first appear. */
function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/** One hue per tile, from the taxonomy palette the catalogue tiles already
 *  use: these are five different things, not five degrees of one status, so
 *  the colour is a label rather than a judgement. */
const HUES = {
  blue: {
    chip: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
    accent: "bg-tile-blue",
  },
  purple: {
    chip: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
    accent: "bg-tile-purple",
  },
  green: {
    chip: "bg-tile-green-bg text-tile-green ring-tile-green/15",
    accent: "bg-tile-green",
  },
  amber: {
    chip: "bg-tile-amber-bg text-tile-amber ring-tile-amber/15",
    accent: "bg-tile-amber",
  },
  teal: {
    chip: "bg-tile-teal-bg text-tile-teal ring-tile-teal/15",
    accent: "bg-tile-teal",
  },
  rose: {
    chip: "bg-tile-rose-bg text-tile-rose ring-tile-rose/15",
    accent: "bg-tile-rose",
  },
} as const;

/**
 * How loudly the closing date shouts, by how close it is.
 *
 * The countdown is the only figure on this band with a clock attached, and a
 * missed deadline is the one mistake this page exists to prevent — so from
 * `soon` inwards it stops being a grey caption under the date and becomes a
 * badge, on a card that carries a matching ring. `critical` adds the pulse:
 * reserved for the last two days, where it means "today or you have lost it"
 * rather than decoration.
 */
const CLOSING_ALARMS: Record<
  ClosingLevel,
  {
    hue: keyof typeof HUES;
    ring?: string;
    badge?: string;
    icon?: typeof Clock;
    pulse?: boolean;
  }
> = {
  critical: {
    hue: "rose",
    ring: "ring-1 ring-destructive/40",
    badge: "bg-destructive text-destructive-foreground shadow-sm",
    icon: AlertTriangle,
    pulse: true,
  },
  urgent: {
    hue: "rose",
    ring: "ring-1 ring-tile-rose/30",
    // `text-background`, not `text-white`: the rose ink is dark in the light
    // theme and light in the dark one, so the label has to flip with it.
    badge: "bg-tile-rose text-background shadow-sm",
    icon: AlertTriangle,
  },
  soon: {
    hue: "amber",
    ring: "ring-1 ring-tile-amber/35",
    badge: "bg-tile-amber-bg text-tile-amber ring-1 ring-inset ring-tile-amber/30",
    icon: Clock,
  },
  calm: { hue: "amber" },
  closed: { hue: "amber", badge: "bg-secondary text-muted-foreground" },
};

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  hue,
  ring,
  alert,
  title,
  wrap,
  onClick,
  className,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof FileStack;
  hue: keyof typeof HUES;
  /** Ring drawn round the whole card, to lift it out of the row. */
  ring?: string;
  /** Renders the hint as a badge instead of a caption. */
  alert?: {
    text: string;
    badge?: string;
    icon?: typeof FileStack;
    pulse?: boolean;
  };
  /** Tooltip on the value, for a card whose value is too long to show whole. */
  title?: string;
  /** Let a long value wrap onto a second line, at a smaller size, instead of
   *  being cut off. For a value that is a *list* rather than a single figure. */
  wrap?: boolean;
  /** Makes the card a button. */
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const { chip, accent } = HUES[hue];
  const AlertIcon = alert?.icon;
  const interactive = Boolean(onClick);

  const body = (
    <>
      {/* The one place per card that carries the hue at full strength — the
          chip and any bar below it are tints of the same colour. */}
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-0.75", accent)}
      />

      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105",
            chip,
          )}
        >
          <Icon className="size-[17px]" strokeWidth={2} />
        </span>
        <p
          title={label}
          className="line-clamp-2 pt-0.5 text-[11px] font-bold uppercase leading-snug tracking-wider text-muted-foreground"
        >
          {label}
        </p>
      </div>

      <p
        title={title ?? value}
        className={cn(
          "mt-2.5 font-bold leading-tight tracking-tight tabular-nums text-foreground",
          // Two lines at a smaller size once the value stops being a figure
          // and becomes a list. Past two lines it does truncate — the tooltip
          // and the cross-check callout both carry the full set.
          wrap && value.length > 10
            ? "line-clamp-2 break-words text-base"
            : "truncate text-xl",
          interactive && "group-hover:text-primary",
        )}
      >
        {value}
      </p>
      {children}
      {alert?.badge ? (
        <span
          className={cn(
            "mt-1.5 inline-flex w-fit max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
            alert.badge,
          )}
        >
          {alert.pulse && (
            <span aria-hidden className="relative flex size-1.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-current" />
            </span>
          )}
          {AlertIcon && !alert.pulse && (
            <AlertIcon className="size-3 shrink-0" strokeWidth={2.5} />
          )}
          <span className="truncate">{alert.text}</span>
        </span>
      ) : (
        <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
          {hint}
        </p>
      )}
    </>
  );

  const shell = cn(
    "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
    ring,
    className,
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          shell,
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        {body}
      </button>
    );
  }

  return <div className={shell}>{body}</div>;
}

function ReadinessStrip({ readiness }: { readiness: Readiness }) {
  const tone = {
    empty: {
      icon: ScanLine,
      wrap: "border-border/60 bg-secondary/40",
      badge: "bg-secondary text-secondary-foreground",
    },
    blocked: {
      icon: AlertTriangle,
      wrap: "border-warning/30 bg-warning/10",
      badge: "bg-warning/20 text-warning-foreground",
    },
    ready: {
      icon: Check,
      wrap: "border-border/60 bg-success/[0.07]",
      badge: "bg-success/15 text-success",
    },
    live: {
      icon: CheckCheck,
      wrap: "border-border/60 bg-success/[0.07]",
      badge: "bg-success/15 text-success",
    },
  }[readiness.kind];
  const Icon = tone.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-4 py-3",
        tone.wrap,
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-lg",
          tone.badge,
        )}
      >
        <Icon className="size-3.5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground">
          {readiness.headline}
        </p>
        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
          {readiness.detail}
        </p>
      </div>
    </div>
  );
}
