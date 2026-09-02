import {
  CheckCircle2,
  FileText,
  Handshake,
  MessageSquare,
  PenLine,
  Send,
  type LucideIcon,
} from "lucide-react";
import type {
  CommunicationChannel,
  SourcingRequestListItem,
  SourcingStatus,
} from "@/types/api";

/**
 * How the pipeline reads on screen.
 *
 * Two deliberate changes from the first version of this screen:
 *
 * 1. "Awaiting Response" is not a stage. Every request entered it the instant
 *    it was sent, so it added a column without adding a fact. `sent` *is*
 *    awaiting, and the row says how long it has been waiting instead.
 * 2. The terminal statuses no longer get a card. Six equal-weight cards, one
 *    of which was a graveyard, spent the top of the screen on the requests a
 *    buyer is least likely to act on. The five that remain are the ones with
 *    work in them; closed enquiries are reachable from the status filter.
 */

export type StageKey =
  | "draft"
  | "sent"
  | "replied"
  | "quotation_received"
  | "negotiating";

export type StageStyle = {
  key: StageKey;
  label: string;
  icon: LucideIcon;
  /** The statuses this card counts. */
  statuses: SourcingStatus[];
  /** Icon tile: tinted square. */
  tile: string;
  /** The caption under the count — what these requests actually are, not a
   *  generic "Request(s)" repeated on every card. */
  countLabel: string;
  /** Colours for the "waiting on you" badge, or null on the stages where
   *  waiting is not a meaningful state. The number itself always comes from
   *  the stage's own column, so it can never exceed the count beside it. */
  badge: string | null;
};

export const PIPELINE_STAGES: StageStyle[] = [
  {
    key: "draft",
    label: "Draft",
    icon: PenLine,
    statuses: ["draft"],
    tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
    countLabel: "Draft enquiries",
    // Nobody is waiting on a draft — it has never left the building.
    badge: null,
  },
  {
    key: "sent",
    label: "Sent",
    icon: Send,
    statuses: ["sent"],
    tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
    countLabel: "Awaiting reply",
    // `sent` means we wrote last by definition, so its awaiting count is
    // always zero. A badge here would be dead pixels.
    badge: null,
  },
  {
    key: "replied",
    label: "Replied",
    icon: MessageSquare,
    statuses: ["replied"],
    tile: "bg-tile-green-bg text-tile-green ring-tile-green/15",
    countLabel: "New replies",
    badge: "bg-success text-success-foreground",
  },
  {
    key: "quotation_received",
    label: "Quotations",
    icon: FileText,
    statuses: ["quotation_received"],
    tile: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
    countLabel: "Quotes received",
    badge: "bg-tile-purple text-primary-foreground",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    icon: Handshake,
    statuses: ["negotiating"],
    tile: "bg-tile-amber-bg text-tile-amber ring-tile-amber/15",
    countLabel: "In negotiation",
    badge: "bg-tile-amber text-warning-foreground",
  },
];

/** The row badge, which stays per-status — a rejected supplier and one that
 *  never answered are the same end of the pipeline but very different facts. */
export type StatusStyle = { label: string; badge: string; dot: string };

export const STATUS_STYLES: Record<SourcingStatus, StatusStyle> = {
  draft: {
    label: "Draft",
    badge: "bg-secondary text-secondary-foreground ring-border/60",
    dot: "bg-muted-foreground",
  },
  sent: {
    label: "Sent",
    badge: "bg-tile-blue-bg text-tile-blue ring-tile-blue/20",
    dot: "bg-tile-blue",
  },
  replied: {
    label: "Replied",
    badge: "bg-tile-green-bg text-tile-green ring-tile-green/20",
    dot: "bg-tile-green",
  },
  quotation_received: {
    label: "Quotation",
    badge: "bg-tile-purple-bg text-tile-purple ring-tile-purple/20",
    dot: "bg-tile-purple",
  },
  negotiating: {
    label: "Negotiating",
    badge: "bg-tile-amber-bg text-tile-amber ring-tile-amber/20",
    dot: "bg-tile-amber",
  },
  selected: {
    label: "Selected",
    badge: "bg-success/10 text-success ring-success/20",
    dot: "bg-success",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  no_response: {
    label: "No Response",
    badge: "bg-destructive/10 text-destructive ring-destructive/20",
    dot: "bg-destructive",
  },
  cancelled: {
    label: "Cancelled",
    badge: "bg-secondary text-muted-foreground ring-border/60",
    dot: "bg-muted-foreground",
  },
};

/** Statuses a user can move a request to, in pipeline order. */
export const STATUS_OPTIONS: SourcingStatus[] = [
  "draft",
  "sent",
  "replied",
  "quotation_received",
  "negotiating",
  "selected",
  "rejected",
  "no_response",
  "cancelled",
];

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  wechat: "WeChat",
  meeting: "Meeting",
  other: "Other",
};

/* --- What the row is actually asking of you --------------------------------
 *
 * A status badge tells a buyer where a request sits. It does not tell them
 * what to do about it, and "1 Response Received" is a fact nobody can act on.
 * These two helpers turn the same row into the two things the table needs: a
 * sentence under the badge saying what the state means right now, and a button
 * saying what to do next.
 */

export type StatusDetail = {
  text: string;
  /** Colour of the dot in front, or null for the quiet states that get no
   *  dot at all — a marker on every row marks nothing. */
  dot: string | null;
};

/** The line under the status badge — the state in the buyer's own terms. */
export function statusDetail(request: SourcingRequestListItem): StatusDetail {
  const overdue = dueIn(request.follow_up_on)?.overdue ?? false;

  switch (request.status) {
    case "draft":
      return {
        text: `Last edited ${relativeTime(request.updated_at).toLowerCase()}`,
        dot: null,
      };
    case "sent":
      return {
        text: overdue ? "Follow-up due" : "Awaiting reply",
        dot: overdue ? "bg-destructive" : null,
      };
    case "replied":
      // `awaiting_us` is the honest version of "unread": the supplier had the
      // last word. Once we answer, the row stops shouting even though its
      // status has not moved.
      return {
        text: request.awaiting_us ? "New reply" : "Replied",
        dot: request.awaiting_us ? "bg-tile-green" : null,
      };
    case "quotation_received": {
      const count = request.quotation_count;
      return {
        text:
          count > 0
            ? `${count} new ${count === 1 ? "quote" : "quotes"}`
            : "Quotation received",
        dot: "bg-tile-amber",
      };
    }
    case "negotiating":
      return { text: "Price discussion", dot: null };
    case "selected":
      return { text: "Supplier selected", dot: null };
    case "rejected":
      return { text: "Not proceeding", dot: null };
    case "no_response":
      return { text: "Never answered", dot: null };
    case "cancelled":
      return { text: "Cancelled", dot: null };
  }
}

/**
 * The tinted square on a group heading.
 *
 * Cycled per group rather than fixed, so a screen full of headings reads as a
 * list of distinct things instead of one repeated icon. Keyed off the row's
 * own id, so a product keeps its colour across sorts, filters and pages —
 * a colour that reshuffled on every re-sort would be worse than no colour.
 */
const GROUP_TILES = [
  "bg-tile-green-bg text-tile-green ring-tile-green/15",
  "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
  "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
  "bg-tile-amber-bg text-tile-amber ring-tile-amber/15",
  "bg-tile-teal-bg text-tile-teal ring-tile-teal/15",
  "bg-tile-rose-bg text-tile-rose ring-tile-rose/15",
];

export function groupTile(id: number): string {
  return GROUP_TILES[Math.abs(id) % GROUP_TILES.length];
}

export type NextAction = {
  label: string;
  /** The pill button's colours. */
  tone: string;
  /** False for a closed request — there is a button, but it only reads. */
  urgent: boolean;
};

/**
 * The one thing to do with this row next.
 *
 * Every branch opens the same enquiry — the label is the point, not the
 * destination. Naming the action rather than the object is what turns the
 * table from a report into a queue.
 */
export function nextAction(request: SourcingRequestListItem): NextAction {
  const overdue = dueIn(request.follow_up_on)?.overdue ?? false;

  switch (request.status) {
    case "draft":
      return {
        label: "Continue",
        tone: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        urgent: false,
      };
    case "sent":
      return {
        label: "Follow up",
        tone: overdue
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "bg-tile-blue-bg text-tile-blue hover:brightness-95",
        urgent: overdue,
      };
    case "replied":
      return {
        label: request.awaiting_us ? "View reply" : "Open thread",
        tone: "bg-tile-green-bg text-tile-green hover:brightness-95",
        urgent: request.awaiting_us,
      };
    case "quotation_received":
      return {
        label: "Review quote",
        tone: "bg-tile-purple-bg text-tile-purple hover:brightness-95",
        urgent: true,
      };
    case "negotiating":
      return {
        label: "View details",
        tone: "bg-tile-amber-bg text-tile-amber hover:brightness-95",
        urgent: false,
      };
    default:
      return {
        label: "View details",
        tone: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        urgent: false,
      };
  }
}

/** Closed as far as the daily queue is concerned. Mirrors the backend's own
 *  `CLOSED_STATUSES`, which the attention counts exclude. */
export const CLOSED_STATUSES: SourcingStatus[] = [
  "selected",
  "rejected",
  "no_response",
  "cancelled",
];

export function isClosed(status: SourcingStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

export const CLOSED_STAGE_ICON = CheckCircle2;

/**
 * The display reference a user quotes down the phone — "SE-2026-023".
 *
 * Derived rather than stored: it is a label, not an identity, and a real
 * per-year sequence would need its own counter and a backfill for existing
 * rows. Deterministic from the id and creation year, so it never changes for a
 * given request.
 */
export function referenceOf(request: {
  id: number;
  created_at: string;
}): string {
  const year = new Date(request.created_at).getFullYear();
  return `SE-${year}-${String(request.id).padStart(3, "0")}`;
}

/** "in 3 days", "today", "5 days overdue" — the phrasing the follow-up column
 *  needs. Returns null when there is no date to describe. */
export function dueIn(iso: string | null): { text: string; overdue: boolean } | null {
  if (!iso) return null;
  const due = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return { text: "Today", overdue: false };
  if (days > 0) {
    return { text: `In ${days} day${days === 1 ? "" : "s"}`, overdue: false };
  }
  const late = Math.abs(days);
  return { text: `${late} day${late === 1 ? "" : "s"} overdue`, overdue: true };
}

/**
 * "2h ago", "3d ago", "Yesterday".
 *
 * The Last Activity column leads with this and puts the absolute timestamp
 * underneath, because "3d ago" is the number a buyer chases on and the date is
 * only what they quote back to the supplier.
 */
export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((Date.now() - then) / 1000);
  // Clock skew between the server and the browser can put a just-written row a
  // few seconds in the future; "in 4 seconds" would read as a bug.
  if (seconds < 60) return "Just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A price band with its unit. Never renders an amount without one — per-kg
 *  and per-piece differ by orders of magnitude on the same item. */
export function priceBand(
  min: string | null,
  max: string | null,
  currency: string | null,
  unit: string | null,
): string | null {
  if (!min) return null;
  const money = currency ? `${currency} ` : "";
  const amount = max ? `${money}${trim(min)}–${trim(max)}` : `${money}${trim(min)}`;
  return unit ? `${amount} / ${unit}` : amount;
}

/** Numerics arrive as strings like "40.0000"; the trailing zeros are storage
 *  precision, not something a buyer wants to read. */
function trim(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
