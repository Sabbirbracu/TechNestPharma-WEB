import type { NoticeTender, TenderNoticeDetail } from "@/types/api";

export type Readiness = {
  kind: "empty" | "blocked" | "ready" | "live";
  headline: string;
  detail: string;
  /** Tenders with no reference number — what actually blocks a confirm. */
  missingReference: NoticeTender[];
};

/**
 * Whether "Confirm & Create Tenders" would succeed, worked out on the client
 * from the same two rules the server enforces in `TenderNoticeService.confirm`:
 * a notice needs tenders, and every tender needs a reference number. Unmapped
 * items deliberately do NOT block — a notice routinely lists things the client
 * does not trade in.
 *
 * Duplicating the rules here is worth it: the alternative is letting the user
 * click a button that fails, and reading the reason out of a red toast.
 */
export function readinessOf(notice: TenderNoticeDetail): Readiness {
  const tenders = notice.tenders;
  const missingReference = tenders.filter(
    (tender) => !(tender.reference_no ?? "").trim(),
  );
  const liveCount = tenders.filter(
    (tender) => tender.notice_confirmed_at !== null,
  ).length;
  const suppliers = tenders.reduce(
    (sum, tender) => sum + tender.selected_supplier_count,
    0,
  );
  const unmapped = notice.item_count - notice.mapped_count;

  if (tenders.length === 0) {
    return {
      kind: "empty",
      headline: "Nothing read from this document yet",
      detail:
        "Press Extract to read the tenders and their requirement lines out of the notice.",
      missingReference,
    };
  }

  if (missingReference.length > 0) {
    return {
      kind: "blocked",
      headline: `${missingReference.length} tender${missingReference.length === 1 ? " has" : "s have"} no reference number`,
      detail:
        "A reference number is how a bid is identified, so confirming is blocked until each one has it. Open the tender and add it.",
      missingReference,
    };
  }

  if (liveCount === tenders.length) {
    return {
      kind: "live",
      headline: `All ${tenders.length} tender${tenders.length === 1 ? " is" : "s are"} live on the tender board`,
      detail:
        unmapped > 0
          ? `${unmapped} requirement line${unmapped === 1 ? "" : "s"} were left unmapped, which is normal for items the client does not trade in.`
          : "Every requirement line was settled before confirming.",
      missingReference,
    };
  }

  return {
    kind: "ready",
    headline: `Ready to confirm — ${tenders.length} tender${tenders.length === 1 ? "" : "s"}, ${suppliers} supplier${suppliers === 1 ? "" : "s"} shortlisted`,
    detail:
      unmapped > 0
        ? `${unmapped} of ${notice.item_count} requirement lines are still unmapped. They will not block the confirm.`
        : "Every requirement line has been settled.",
    missingReference,
  };
}
