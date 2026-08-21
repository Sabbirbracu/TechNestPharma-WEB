import {
  CheckCircle2,
  FileText,
  Handshake,
  MessageSquare,
  PenLine,
  Send,
  type LucideIcon,
} from "lucide-react";
import type { CommunicationChannel, SourcingStatus } from "@/types/api";

/**
 * How the pipeline reads on screen.
 *
 * The API returns all nine statuses; the board shows six stages, because the
 * four terminal ones — selected, rejected, no_response, cancelled — are all
 * "this inquiry is over" as far as the buyer's daily queue is concerned. They
 * stay distinct in the data and on the row badge; only the board groups them,
 * and clicking through still filters by the individual status.
 */

export type StageKey =
  | "draft"
  | "sent"
  | "replied"
  | "quotation_received"
  | "negotiating"
  | "closed";

export type StageStyle = {
  key: StageKey;
  label: string;
  icon: LucideIcon;
  /** The statuses this column counts. */
  statuses: SourcingStatus[];
  /** Icon tile: tinted square. */
  tile: string;
  /** The "View all" button under the count. */
  action: string;
  /** The caption under the count — what these requests actually are, not a
   *  generic "Request(s)" repeated on every card. */
  countLabel: string;
};

export const PIPELINE_STAGES: StageStyle[] = [
  {
    key: "draft",
    label: "Draft",
    icon: PenLine,
    statuses: ["draft"],
    tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
    action: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
    countLabel: "Not yet sent",
  },
  {
    key: "sent",
    // The API has no `awaiting_response` status — every row would enter it the
    // instant it was sent. `sent` *is* awaiting, and the label says so.
    label: "Sent / Awaiting Response",
    icon: Send,
    statuses: ["sent"],
    tile: "bg-tile-blue-bg text-tile-blue ring-tile-blue/15",
    action: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
    countLabel: "Awaiting reply",
  },
  {
    key: "replied",
    label: "Replied",
    icon: MessageSquare,
    statuses: ["replied"],
    tile: "bg-tile-green-bg text-tile-green ring-tile-green/15",
    action: "bg-tile-green-bg text-tile-green hover:brightness-95",
    countLabel: "Awaiting quote",
  },
  {
    key: "quotation_received",
    label: "Quotation Received",
    icon: FileText,
    statuses: ["quotation_received"],
    tile: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
    action: "bg-tile-purple-bg text-tile-purple hover:brightness-95",
    countLabel: "New quotes",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    icon: Handshake,
    statuses: ["negotiating"],
    tile: "bg-tile-amber-bg text-tile-amber ring-tile-amber/15",
    action: "bg-tile-amber-bg text-tile-amber hover:brightness-95",
    countLabel: "In negotiation",
  },
  {
    key: "closed",
    label: "Closed",
    icon: CheckCircle2,
    statuses: ["selected", "rejected", "no_response", "cancelled"],
    tile: "bg-tile-green-bg text-tile-green ring-tile-green/15",
    action: "bg-tile-green-bg text-tile-green hover:brightness-95",
    countLabel: "Finished",
  },
];

/** The row badge, which stays per-status — a rejected supplier and one that
 *  never answered are the same column but very different facts. */
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
    label: "Quotation Received",
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

/** Statuses a user can move a request to, in board order. */
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

/**
 * The display reference a user quotes down the phone — "SR-2026-023".
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
  return `SR-${year}-${String(request.id).padStart(3, "0")}`;
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
