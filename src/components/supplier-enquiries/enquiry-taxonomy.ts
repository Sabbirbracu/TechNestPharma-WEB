import type {
  EnquiryItemBrief,
  EnquiryItemState,
  EnquiryState,
  EnquiryTab,
  LineOutcomeKind,
  Quotation,
} from "@/types/api";

/**
 * Words and colours for Supplier Enquiries (2026-09-17).
 *
 * Status exists at two levels. The enquiry's state is derived on the server
 * from its product lines; each line keeps its own state. Both are named here in
 * the buyer's terms — "Awaiting response", "Partially quoted" — never in the
 * database's.
 */

export const ENQUIRY_TABS: { key: EnquiryTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "awaiting_response", label: "Awaiting Response" },
  { key: "partially_quoted", label: "Partially Quoted" },
  { key: "quotation_received", label: "Quoted" },
  { key: "closed", label: "Closed" },
];

type Style = { label: string; className: string };

export const ENQUIRY_STATE: Record<EnquiryState, Style> = {
  draft: {
    label: "Draft",
    className: "bg-secondary text-secondary-foreground ring-border/70",
  },
  awaiting_response: {
    label: "Awaiting response",
    className: "bg-tile-blue-bg text-tile-blue ring-tile-blue/25",
  },
  partially_quoted: {
    label: "Partially quoted",
    className: "bg-tile-amber-bg text-tile-amber ring-tile-amber/25",
  },
  quotation_received: {
    label: "Quotation received",
    className: "bg-tile-green-bg text-tile-green ring-tile-green/30",
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success ring-success/25",
  },
  closed: {
    label: "Closed",
    className: "bg-secondary text-muted-foreground ring-border/70",
  },
};

export const ITEM_STATE: Record<EnquiryItemState, Style> = {
  pending: {
    label: "Pending",
    className: "bg-secondary text-secondary-foreground ring-border/70",
  },
  requested: {
    label: "Requested",
    className: "bg-tile-blue-bg text-tile-blue ring-tile-blue/25",
  },
  replied: {
    label: "Replied",
    className: "bg-tile-amber-bg text-tile-amber ring-tile-amber/25",
  },
  quoted: {
    label: "Quoted",
    className: "bg-tile-purple-bg text-tile-purple ring-tile-purple/25",
  },
  selected: {
    label: "Selected",
    className: "bg-success/10 text-success ring-success/25",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive ring-destructive/20",
  },
  unavailable: {
    label: "Unavailable",
    className: "bg-secondary text-muted-foreground ring-border/70",
  },
  no_response: {
    label: "No response",
    className: "bg-destructive/10 text-destructive ring-destructive/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-secondary text-muted-foreground ring-border/70",
  },
};

/** What a supplier's reply said about one asked product, in words. Shown
 *  under the line's status so "Replied" says *how* they replied. */
export const LINE_OUTCOME: Record<LineOutcomeKind, { label: string; className: string }> = {
  quoted: { label: "Quoted in reply", className: "text-tile-purple" },
  declined: { label: "Declined", className: "text-destructive" },
  question: { label: "Supplier asked a question", className: "text-tile-amber" },
  not_mentioned: { label: "Not in the reply", className: "text-muted-foreground" },
};

/** "Tender IMP/RM/SEM/18/2026-2027", "2 Tenders", "Direct", "Tender + Direct". */
export function sourceLabel(
  items: EnquiryItemBrief[],
  tenderCount: number,
  directCount: number,
): string {
  if (tenderCount === 0) return "Direct";
  const tenders = distinctTenders(items);
  const tenderPart =
    tenderCount === 1
      ? `Tender ${tenders[0]?.reference ?? tenders[0]?.name ?? ""}`.trim()
      : `${tenderCount} Tenders`;
  return directCount > 0 ? `${tenderPart} + Direct` : tenderPart;
}

export function distinctTenders(items: EnquiryItemBrief[]) {
  const seen = new Map<number, NonNullable<EnquiryItemBrief["tender"]>>();
  for (const item of items) {
    if (item.tender && !seen.has(item.tender.id)) seen.set(item.tender.id, item.tender);
  }
  return [...seen.values()];
}

export function tenderLabel(tender: EnquiryItemBrief["tender"]): string {
  if (!tender) return "Direct sourcing";
  return tender.reference ? `Tender ${tender.reference}` : tender.name;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(new Date(iso).getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function trimNumber(value: string | null): string | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function formatQuantity(qty: string | null, unit: string | null): string {
  const amount = trimNumber(qty);
  if (!amount) return "—";
  return unit ? `${amount} ${unit}` : amount;
}

/** Price with its unit, always — per-kg and per-piece differ by orders of
 *  magnitude on the same product. */
export function formatPrice(q: Pick<Quotation, "price_min" | "price_max" | "currency" | "price_unit">): string {
  const min = trimNumber(q.price_min);
  const max = trimNumber(q.price_max);
  if (!min && !max) return "—";
  const amount = min && max && min !== max ? `${min}–${max}` : (min ?? max);
  const currency = q.currency ? `${q.currency} ` : "";
  return `${currency}${amount}${q.price_unit ? ` / ${q.price_unit}` : ""}`;
}
