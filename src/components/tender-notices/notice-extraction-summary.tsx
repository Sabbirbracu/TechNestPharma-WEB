import { cn } from "@/lib/utils";
import {
  EXTRACTION_METHOD_LABEL,
  formatDate,
  formatFileSize,
  isGuessedText,
} from "./notice-taxonomy";
import type { TenderNoticeDetail } from "@/types/api";

export function ExtractionSummary({ notice }: { notice: TenderNoticeDetail }) {
  const confidence = Number(notice.extraction_confidence);
  const hasConfidence = Number.isFinite(confidence) && confidence > 0;
  const guessed = isGuessedText(notice.extraction_method);

  const rows: [string, React.ReactNode][] = [
    ["Tenders found", String(notice.tender_count)],
    ["Requirement lines extracted", String(notice.item_count)],
    [
      "Lines settled",
      `${notice.mapped_count} of ${notice.item_count} — confirmed or skipped`,
    ],
    [
      "How it was read",
      notice.extraction_method
        ? (EXTRACTION_METHOD_LABEL[notice.extraction_method] ??
          notice.extraction_method)
        : "—",
    ],
    [
      "Extracted",
      notice.extracted_at
        ? new Date(notice.extracted_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Not extracted yet",
    ],
    [
      "Document",
      `${formatFileSize(notice.file_size_bytes)}${notice.page_count ? ` · ${notice.page_count} page(s)` : ""}`,
    ],
    ["Captured", formatDate(notice.created_at)],
  ];

  return (
    <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2 last:border-0"
          >
            <dt className="shrink-0 text-xs font-medium text-muted-foreground">
              {label}
            </dt>
            <dd className="text-right text-xs font-bold text-foreground">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="space-y-3">
        {hasConfidence && (
          <div className="rounded-xl border border-border/60 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-bold text-foreground">
                Extraction confidence
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {confidence}%
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full",
                  confidence >= 95
                    ? "bg-success"
                    : confidence >= 85
                      ? "bg-primary"
                      : "bg-warning",
                )}
                style={{ width: `${Math.min(confidence, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-medium leading-relaxed text-muted-foreground">
              {guessed
                ? "This is the reader's own estimate of how well it made out the characters. It is not a guarantee — check the figures against the document."
                : "Read from the document's text layer, so the characters are exact rather than guessed."}
            </p>
          </div>
        )}

        {notice.notes && (
          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-xs font-bold text-foreground">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-xs font-medium leading-relaxed text-muted-foreground">
              {notice.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
