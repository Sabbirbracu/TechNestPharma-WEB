import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  CheckCheck,
  FileStack,
  Link2,
  ListChecks,
  Clock,
  ScanLine,
  Wallet,
} from "lucide-react";
import { closingLabel } from "@/components/tenders/tender-status";
import type { ClosingLevel } from "@/components/tenders/tender-status";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "./notice-taxonomy";
import type { Readiness } from "./notice-readiness";
import type { TenderNoticeDetail } from "@/types/api";

/**
 * The notice's real figures, and one line saying whether it can go live.
 *
 * Each figure is its own card carrying one hue from the taxonomy palette, so
 * the six read as six separate things at a glance rather than as one block of
 * numbers to be parsed left to right.
 */
export function SummaryBand({
  notice,
  readiness,
}: {
  notice: TenderNoticeDetail;
  readiness: Readiness;
}) {
  const tenders = notice.tenders;
  const liveCount = tenders.filter(
    (t) => t.notice_confirmed_at !== null,
  ).length;
  const progress =
    notice.item_count > 0
      ? Math.round((notice.mapped_count / notice.item_count) * 100)
      : 0;

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

  // Schedule costs only add up within one currency. Mixed currencies are a
  // real possibility on an international notice, so say "mixed" rather than
  // print a total that means nothing.
  const currencies = new Set(
    tenders
      .map((tender) => tender.schedule_currency)
      .filter((currency): currency is string => Boolean(currency)),
  );
  const costTotal = tenders.reduce(
    (sum, tender) => sum + (Number(tender.schedule_cost) || 0),
    0,
  );
  const usdTotal = tenders.reduce(
    (sum, tender) => sum + (Number(tender.schedule_cost_usd) || 0),
    0,
  );
  // What a confirm would shortlist right now — already deduped per tender by
  // the API, so summing across tenders is the true total.
  const supplierTotal = tenders.reduce(
    (sum, tender) => sum + tender.selected_supplier_count,
    0,
  );

  const alarm = CLOSING_ALARMS[countdown?.level ?? "calm"];

  return (
    <section className="space-y-3">
      {/* Six tiles, not five: the grid is 2, 3 and 6 columns wide at its three
          breakpoints, and six divides into all of them — an odd count would
          leave a hole in the last row at every width. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Tile
          label="Tenders"
          value={String(notice.tender_count)}
          hint={
            liveCount > 0
              ? `${liveCount} live · ${notice.tender_count - liveCount} draft`
              : "none confirmed yet"
          }
          icon={FileStack}
          hue="blue"
        />
        <Tile
          label="Requirement lines"
          value={String(notice.item_count)}
          hint={
            notice.tender_count > 0
              ? `across ${notice.tender_count} tender${notice.tender_count === 1 ? "" : "s"}`
              : "nothing extracted"
          }
          icon={ListChecks}
          hue="purple"
        />
        <Tile
          label="Mapped"
          value={`${notice.mapped_count}/${notice.item_count}`}
          hint={`${progress}% settled`}
          icon={Link2}
          hue="green"
        >
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress === 100 ? "bg-success" : "bg-tile-green",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </Tile>
        <Tile
          label="Nearest closing"
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
          label="Schedule cost"
          value={
            currencies.size > 1
              ? "Mixed"
              : formatMoney(
                  costTotal ? String(costTotal) : null,
                  [...currencies][0] ?? null,
                )
          }
          hint={
            currencies.size > 1
              ? [...currencies].join(" · ")
              : usdTotal
                ? `≈ USD ${usdTotal.toFixed(2)}`
                : "for all schedules"
          }
          icon={Wallet}
          hue="teal"
        />
        <Tile
          label="Suppliers"
          value={String(supplierTotal)}
          hint={
            supplierTotal > 0
              ? "would be shortlisted"
              : "none ticked on any line"
          }
          icon={Building2}
          hue="rose"
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

/** One hue per tile, from the taxonomy palette the catalogue tiles already
 *  use: these figures are six different things, not six degrees of one
 *  status, so the colour is a label rather than a judgement. */
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
  children?: React.ReactNode;
}) {
  const { chip, accent } = HUES[hue];
  const AlertIcon = alert?.icon;

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
        ring,
      )}
    >
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

      <p className="mt-2.5 truncate text-xl font-bold leading-tight tracking-tight tabular-nums text-foreground">
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
    </div>
  );
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
