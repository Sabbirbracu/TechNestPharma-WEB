import { CheckCircle2 } from "lucide-react";
import { Callout } from "./notice-callout";
import type { NoticeCrossCheck } from "@/types/api";

/**
 * The source site's tender numbers, checked against the ones OCR read.
 *
 * This is what the notice's listing rows are kept for. edcl.gov.bd publishes
 * its `দরপত্র নং` column as real text — 10, 11, 12 — while the same numbers
 * inside the document have to be guessed from pixels on a scan with no text
 * layer, out of a ruled column narrow enough that references wrap mid-number.
 * That is the least trustworthy field the pipeline produces and the one every
 * downstream record is keyed on, so having a second, cleaner source for it is
 * worth surfacing rather than leaving in the database.
 *
 * The two directions read differently and are deliberately worded apart:
 *
 *   - **listed but not found** is ours to fix. Either extraction dropped a
 *     row or it misread the reference past recognition.
 *   - **found but not listed** is usually the *site's* omission, not our
 *     error, and is not a reason to distrust the extraction. Notice #287 on
 *     2026-09-03 was exactly this: the listing offered 06, 07 and 08 while
 *     the document held 04 through 08.
 *
 * A passing check is shown too, quietly. The OCR warning above it tells the
 * reader every character is a guess; leaving a successful verification
 * invisible would mean the one screen that can partly answer that worry
 * stays silent.
 */
export function CrossCheckCallout({ check }: { check: NoticeCrossCheck | null }) {
  // `checked` false means there was genuinely nothing to compare — a
  // hand-uploaded notice with no listing rows, or one not yet extracted.
  // Rendering a tick there would put a mark against something never examined.
  if (!check || !check.checked) return null;

  if (check.ok) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-tile-green/25 bg-tile-green-bg/50 p-3 text-xs font-medium leading-relaxed text-foreground/80">
        <CheckCircle2
          className="mt-px size-3.5 shrink-0 text-tile-green"
          strokeWidth={2.25}
        />
        <span className="min-w-0">
          Tender numbers match the source site
          {check.site_refs.length > 0 && (
            <>
              {" "}
              (<RefList refs={check.site_refs} />)
            </>
          )}
          . The numbers read off the scan agree with the ones the site
          published as text.
        </span>
      </div>
    );
  }

  return (
    <Callout tone="warning">
      <span className="font-bold">
        The source site and this document do not agree on which tenders are
        here.
      </span>{" "}
      The site lists <RefList refs={check.site_refs} /> as text; OCR read{" "}
      <RefList refs={check.document_refs} /> off the scan.
      <ul className="mt-1.5 space-y-1">
        {check.missing_from_document.length > 0 && (
          <li>
            <span className="font-bold">
              Listed on the site but not found in the document:
            </span>{" "}
            <RefList refs={check.missing_from_document} /> — check whether
            extraction dropped a row or misread its reference.
          </li>
        )}
        {check.unexpected_in_document.length > 0 && (
          <li>
            <span className="font-bold">
              In the document but not listed on the site:
            </span>{" "}
            <RefList refs={check.unexpected_in_document} /> — usually the
            site&rsquo;s own listing being incomplete rather than a misreading.
          </li>
        )}
      </ul>
    </Callout>
  );
}

/** Reference numbers set in mono, so 0/O and 1/l are told apart by eye —
 *  which is the exact confusion this whole check exists to catch. */
function RefList({ refs }: { refs: string[] }) {
  if (refs.length === 0) return <span className="italic">nothing</span>;
  return (
    <>
      {refs.map((ref, index) => (
        <span key={ref}>
          {index > 0 && ", "}
          <code className="rounded bg-foreground/10 px-1 py-px font-mono text-[11px]">
            {ref}
          </code>
        </span>
      ))}
    </>
  );
}
