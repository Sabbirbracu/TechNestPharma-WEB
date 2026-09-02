import { buyerCode } from "@/lib/buyer";
import { cn } from "@/lib/utils";

/**
 * The procuring authority as a short chip, to sit beside a reference number.
 *
 * A reference alone does not identify a tender in a list: one notice carries
 * half a dozen whose numbers differ only by a serial, and once tenders from
 * two authorities share a screen the buyer is the distinguishing fact. The
 * full name is always in the tooltip, so the abbreviation is never the only
 * thing on offer.
 *
 * Renders nothing when no buyer is recorded, so callers can drop it in without
 * guarding — the reference then just stands on its own.
 */
export function BuyerBadge({
  buyerName,
  className,
}: {
  buyerName: string | null | undefined;
  className?: string;
}) {
  const code = buyerCode(buyerName);
  if (!code) return null;

  return (
    <span
      title={buyerName ?? undefined}
      className={cn(
        "shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary",
        className,
      )}
    >
      {code}
    </span>
  );
}
