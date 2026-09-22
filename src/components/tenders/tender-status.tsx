import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Clock,
  Package,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  TenderAuthorityType,
  TenderDisplayStatus,
  TenderStatus,
} from "@/types/api";

/** How a tender's state reads on screen. `draft` is where a tender lives while
 *  its shortlist is still being built, which is most of its life — so it is
 *  styled as ordinary, not as unfinished business. */
const STATUS: Record<
  TenderStatus,
  { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  submitted: { label: "Submitted", variant: "default" },
  won: { label: "Won", variant: "success" },
  lost: { label: "Lost", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "warning" },
};

export const TENDER_STATUS_OPTIONS = (
  Object.keys(STATUS) as TenderStatus[]
).map((value) => ({ value, label: STATUS[value].label }));

export function TenderStatusBadge({ status }: { status: TenderStatus }) {
  const { label, variant } = STATUS[status];
  return (
    <Badge variant={variant} className="px-2.5 py-0.5 text-[11px]">
      {label}
    </Badge>
  );
}

/** The board's definition of "closing soon" — a tender due inside this many
 *  days is on the clock. One constant so the stat card's bucket and every
 *  countdown badge agree about where the amber starts. */
export const CLOSING_SOON_WINDOW_DAYS = 15;

/** How hard the countdown should press on the reader. `urgent` alone could
 *  not carry this: a deadline two weeks out is not an emergency, but it is
 *  the thing on the page a buyer most needs to notice. */
export type ClosingLevel = "closed" | "critical" | "urgent" | "soon" | "calm";

/** Days until the deadline, phrased the way a buyer thinks about it. Returns
 *  null when there is no closing date to count down to. */
export function closingLabel(closingDate: string | null): {
  text: string;
  urgent: boolean;
  level: ClosingLevel;
  days: number;
} | null {
  if (!closingDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${closingDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  const level: ClosingLevel =
    days < 0
      ? "closed"
      : days <= 1
        ? "critical"
        : days <= 7
          ? "urgent"
          : days <= CLOSING_SOON_WINDOW_DAYS
            ? "soon"
            : "calm";

  if (days < 0)
    return { text: `Closed ${Math.abs(days)}d ago`, urgent: false, level, days };
  if (days === 0) return { text: "Closes today", urgent: true, level, days };
  if (days === 1) return { text: "Closes tomorrow", urgent: true, level, days };
  return { text: `${days} days left`, urgent: days <= 7, level, days };
}

/**
 * The board's own six buckets — what the stat cards count and every row
 * badge reads, as opposed to `TenderStatusBadge` above, which shows the raw
 * stored `status` (used only where that value is being edited directly).
 * `open` and `closing_soon` are not stored states; see `display_status_expr`
 * on the backend for how a live tender lands in one or the other.
 */
export type DisplayStatusStyle = {
  key: TenderDisplayStatus;
  label: string;
  icon: LucideIcon;
  badge: string;
  dot: string;
  /** Icon tile: tinted square, for the stat card. */
  tile: string;
  /** Solid top-edge accent, for the stat card — the one place per card that
   *  carries the status colour at full strength rather than a tint. */
  accent: string;
};

export const DISPLAY_STATUS_STYLES: Record<TenderDisplayStatus, DisplayStatusStyle> = {
  open: {
    key: "open",
    label: "Open",
    icon: Package,
    badge: "bg-success/10 text-success ring-success/20",
    dot: "bg-success",
    tile: "bg-tile-green/15 text-tile-green ring-tile-green/30",
    accent: "bg-tile-green",
  },
  closing_soon: {
    key: "closing_soon",
    label: "Closing Soon",
    icon: CalendarClock,
    badge: "bg-tile-amber-bg text-tile-amber ring-tile-amber/20",
    dot: "bg-tile-amber",
    tile: "bg-tile-amber/15 text-tile-amber ring-tile-amber/30",
    accent: "bg-tile-amber",
  },
  closed: {
    key: "closed",
    label: "Closed",
    icon: CalendarX2,
    badge: "bg-secondary text-foreground/70 ring-border/60",
    dot: "bg-foreground/40",
    tile: "bg-secondary text-foreground/70 ring-border/50",
    accent: "bg-border",
  },
  awarded: {
    key: "awarded",
    label: "Awarded",
    icon: CheckCircle2,
    badge: "bg-tile-purple-bg text-tile-purple ring-tile-purple/20",
    dot: "bg-tile-purple",
    tile: "bg-tile-purple/15 text-tile-purple ring-tile-purple/30",
    accent: "bg-tile-purple",
  },
  cancelled: {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    badge: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
    tile: "bg-destructive/15 text-destructive ring-destructive/30",
    accent: "bg-destructive",
  },
  lost: {
    key: "lost",
    label: "Lost",
    icon: Clock,
    badge: "bg-secondary text-muted-foreground ring-border/60",
    dot: "bg-muted-foreground",
    tile: "bg-secondary text-muted-foreground ring-border/50",
    accent: "bg-border",
  },
};

/** Cards in the stat strip — `lost` and `closed` are real, filterable buckets
 *  but have no card of their own, matching the reference: a lost bid, or one
 *  whose deadline simply ran out, is not a thing the buyer tracks toward, it
 *  is just excluded from the four that are. */
export const DISPLAY_STATUS_CARD_ORDER: Exclude<
  TenderDisplayStatus,
  "lost" | "closed"
>[] = [
  "open",
  "closing_soon",
  "cancelled",
];

export const DISPLAY_STATUS_OPTIONS = (
  Object.keys(DISPLAY_STATUS_STYLES) as TenderDisplayStatus[]
).map((value) => ({ value, label: DISPLAY_STATUS_STYLES[value].label }));

export function DisplayStatusBadge({ status }: { status: TenderDisplayStatus }) {
  const style = DISPLAY_STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        style.badge,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

const AUTHORITY_TYPE_LABELS: Record<TenderAuthorityType, string> = {
  government: "Government",
  private: "Private",
};

export const AUTHORITY_TYPE_OPTIONS = (
  Object.keys(AUTHORITY_TYPE_LABELS) as TenderAuthorityType[]
).map((value) => ({ value, label: AUTHORITY_TYPE_LABELS[value] }));

export function authorityTypeLabel(value: TenderAuthorityType | null): string {
  return value ? AUTHORITY_TYPE_LABELS[value] : "—";
}

/** Small summary tiles reused by the detail page header. */
export function TenderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3.5 py-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-bold text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}
