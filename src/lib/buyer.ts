/**
 * The procuring authority, reduced to a badge.
 *
 * Shared by the tender-notice review screens and the live tenders module:
 * both list references that differ only by a serial number, and the buyer is
 * what makes one identifiable at a glance.
 */
/** Words that carry no identity in an authority's name, so they never make it
 *  into the initials. */
const BUYER_STOPWORDS = new Set([
  "of",
  "the",
  "and",
  "for",
  "on",
  "in",
  "&",
]);

/**
 * A short badge for the procuring authority, to prefix a reference number with.
 *
 * One notice carries half a dozen tenders whose references differ only in a
 * serial number — `IMP/RM/SEM/10/2026-2027` against `.../11/...` — so the
 * reference alone is nearly useless for telling them apart at a glance, and
 * useless again when tenders from two authorities sit in the same list. The
 * authority is the distinguishing fact, and it is already on the record as
 * `buyer_name`.
 *
 * Names arrive both ways: already abbreviated (`EDCL`, `DGDA`) or spelled out
 * (`Essential Drugs Company Limited`). Short ones are shown as they are;
 * longer ones are reduced to initials, skipping the connecting words — which
 * turns that same name into `EDCL`, and `Directorate General of Health
 * Services` into `DGHS`. The full name always travels in a `title` attribute,
 * so an abbreviation is never the only thing on offer.
 *
 * Returns null when there is nothing usable, and the caller shows the bare
 * reference rather than an empty separator.
 */
export function buyerCode(buyerName: string | null | undefined): string | null {
  const name = buyerName?.trim();
  if (!name) return null;

  // Already short enough to read as a badge — including names that are not
  // acronyms at all, like "IBNE SINA", which initials would destroy.
  if (name.length <= 12) return name;

  const initials = name
    .split(/[\s/,.-]+/)
    .filter((word) => word && !BUYER_STOPWORDS.has(word.toLowerCase()))
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  // A single surviving word gives a one-letter "code", which says nothing;
  // fall back to the name itself and let the layout truncate it.
  return initials.length >= 2 ? initials : name;
}
