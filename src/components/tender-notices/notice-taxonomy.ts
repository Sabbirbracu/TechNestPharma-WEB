import type {
  MappingStatus,
  MatchMethod,
  NoticeStatus,
} from "@/types/api";

/** The pipeline, in the order a notice moves through it (plan §15).
 *
 *  `needs_review` is where every extraction stops. Nothing promotes itself:
 *  a reference number misread off a scan looks authoritative on the tender
 *  board, and that is a lost bid rather than a cosmetic error.
 */
export const NOTICE_STEPS = [
  { key: "captured", label: "Notice Captured", hint: "Document stored" },
  { key: "extracted", label: "Extracted", hint: "Tenders detected" },
  { key: "needs_review", label: "Review", hint: "Verify extracted data" },
  { key: "mapping", label: "Map Products", hint: "Match with catalogue" },
  { key: "confirmed", label: "Create Tenders", hint: "Save to system" },
] as const;

export const NOTICE_STATUS_LABEL: Record<NoticeStatus, string> = {
  captured: "Captured",
  extracting: "Extracting…",
  extracted: "Extracted",
  needs_review: "Needs Review",
  confirmed: "Confirmed",
  failed: "Failed",
};

export const NOTICE_STATUS_STYLE: Record<NoticeStatus, string> = {
  captured: "bg-secondary text-secondary-foreground ring-border/60",
  extracting: "bg-primary/10 text-primary ring-primary/20",
  extracted: "bg-primary/10 text-primary ring-primary/20",
  needs_review: "bg-warning/10 text-warning-foreground ring-warning/30",
  confirmed: "bg-success/10 text-success ring-success/20",
  failed: "bg-destructive/10 text-destructive ring-destructive/20",
};

export const MAPPING_STATUS_LABEL: Record<MappingStatus, string> = {
  unmapped: "No match",
  suggested: "Needs review",
  confirmed: "Matched",
  skipped: "Skipped",
};

export const MAPPING_STATUS_STYLE: Record<MappingStatus, string> = {
  unmapped: "bg-secondary text-muted-foreground ring-border/60",
  suggested: "bg-warning/10 text-warning-foreground ring-warning/30",
  confirmed: "bg-success/10 text-success ring-success/20",
  skipped: "bg-secondary text-muted-foreground ring-border/60",
};

/** How the characters were obtained, in plain words.
 *
 *  Shown rather than hidden because the three paths are not equally
 *  trustworthy: a PDF's text layer is exact, while OCR is guessed. A reviewer
 *  who knows which one produced a row knows how hard to look at it.
 */
export const EXTRACTION_METHOD_LABEL: Record<string, string> = {
  pdf_table: "PDF table (exact)",
  pdf_text: "PDF text (exact)",
  ocr_layout: "OCR + layout",
  ocr: "OCR",
  manual: "Entered by hand",
};

/** Whether the reader should double-check every figure. True for the OCR
 *  paths, where characters are guessed rather than read. */
export function isGuessedText(method: string | null): boolean {
  return method === "ocr" || method === "ocr_layout";
}

export const MATCH_METHOD_LABEL: Record<MatchMethod, string> = {
  exact: "exact",
  normalized: "normalised",
  alias: "alias",
  fuzzy: "fuzzy",
  manual: "chosen",
};

/** Colour for a confidence bar. Deliberately three bands, not a gradient:
 *  the buyer's decision is "accept / look / search", not a shade. */
export function confidenceTone(value: number): string {
  if (value >= 95) return "bg-success";
  if (value >= 85) return "bg-primary";
  return "bg-warning";
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "11:00:00" → "11:00 AM". The API sends a bare time, not a timestamp,
 *  because the notice states a date and an hour separately and a NULL hour on
 *  a known date is a real case. */
export function formatTime(value: string | null): string {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  if (Number.isNaN(hour)) return value;
  const meridiem = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minutes} ${meridiem}`;
}

export function formatMoney(
  amount: string | null,
  currency: string | null,
): string {
  if (!amount) return "—";
  const value = Number(amount);
  const shown = Number.isNaN(value) ? amount : value.toLocaleString();
  return currency === "BDT" ? `Tk. ${shown}` : `${currency ?? ""} ${shown}`.trim();
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Link to one tender's own page.
 *
 * The reference number contains slashes — `IMP/RM/SEM/10/2026-2027` — and the
 * client asked for them to appear literally in the URL rather than
 * percent-encoded. That means the route is a catch-all segment
 * (`[id]/[...reference]`) and the reference arrives back as an array of path
 * parts to be rejoined.
 *
 * Each part is still encoded individually, so a reference containing a `?`,
 * `#` or a space cannot break the URL — only the separating slashes are left
 * bare, which is exactly the effect wanted.
 */
export function tenderHref(
  noticeId: number,
  reference: string | null,
): string {
  const base = `/tender-notices/${noticeId}`;
  if (!reference) return base;
  const path = reference
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${base}/${path}`;
}

/** Rebuild the reference from a catch-all route's segments. */
export function referenceFromSegments(segments: string[]): string {
  return segments.map((part) => decodeURIComponent(part)).join("/");
}
