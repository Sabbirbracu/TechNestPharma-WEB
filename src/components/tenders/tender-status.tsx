import { Badge } from "@/components/ui/badge";
import type { TenderStatus } from "@/types/api";

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

/** Days until the deadline, phrased the way a buyer thinks about it. Returns
 *  null when there is no closing date to count down to. */
export function closingLabel(closingDate: string | null): {
  text: string;
  urgent: boolean;
} | null {
  if (!closingDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${closingDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { text: `Closed ${Math.abs(days)}d ago`, urgent: false };
  if (days === 0) return { text: "Closes today", urgent: true };
  if (days === 1) return { text: "Closes tomorrow", urgent: true };
  return { text: `${days} days left`, urgent: days <= 7 };
}
