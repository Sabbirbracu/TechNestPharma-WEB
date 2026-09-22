/**
 * The short form of a tender reference, for lists: `IMP/RM/SEM/18/2026-2027`
 * → `SEM/18`.
 *
 * EDCL references share everything but the plant and serial — the `IMP/RM`
 * prefix and the fiscal year repeat on every row — so the full string makes a
 * list of tenders unreadable. The short form keeps the last two segments once
 * year segments are dropped.
 *
 * Lists only. Wherever the reference is quoted back to the authority (the
 * tender's own page, exports, clipboard, confirm dialogs) use the full string,
 * and pass it as a `title` next to the short form so it is one hover away.
 */
const YEAR_SEGMENT = /^\d{4}(?:-\d{0,4})?$/;

export function shortReference(reference: string): string;
export function shortReference(reference: string | null | undefined): string | null;
export function shortReference(reference: string | null | undefined): string | null {
  const full = reference?.trim();
  if (!full) return null;
  const parts = full
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && !YEAR_SEGMENT.test(part));
  return parts.length >= 2 ? parts.slice(-2).join("/") : full;
}
