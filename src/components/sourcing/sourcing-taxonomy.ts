import type { SourcingStatus } from "@/types/api";

/**
 * What remains of the old Sourcing board's vocabulary after the Supplier
 * Enquiries redesign (2026-09-17): the per-line status badge the tender page
 * shows beside each supplier, and the relative time the notification tray
 * uses. The enquiry pages have their own in
 * `components/supplier-enquiries/enquiry-taxonomy.ts`.
 */

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
  unavailable: {
    label: "Unavailable",
    badge: "bg-secondary text-muted-foreground ring-border/60",
    dot: "bg-muted-foreground",
  },
};

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
