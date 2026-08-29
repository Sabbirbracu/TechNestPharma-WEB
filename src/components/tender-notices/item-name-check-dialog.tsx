"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  NoticeDocumentFrame,
  useNoticeDocumentUrl,
} from "./notice-document-view";
import {
  EXTRACTION_METHOD_LABEL,
  MAPPING_STATUS_LABEL,
  MAPPING_STATUS_STYLE,
  isGuessedText,
} from "./notice-taxonomy";
import { cn } from "@/lib/utils";
import type {
  NoticeTender,
  NoticeTenderItem,
  TenderNoticeDetail,
} from "@/types/api";

/**
 * Every extracted line beside the page it was read from.
 *
 * The one check the review screen could not support: a requirement line is a
 * machine's reading of a printed name, and the only way to know whether
 * "Calcium Gluconate" was actually on the page is to look at the page. Doing
 * that meant leaving the tender, opening the Source Document panel on the
 * notice, and holding twenty names in your head on the way back.
 *
 * So: the names on the left, the document on the right, nothing else. The
 * lines are shown exactly as extracted — never the matched product's name,
 * which is a different string and the very thing being verified.
 */
export function ItemNameCheckDialog({
  notice,
  tender,
  open,
  onClose,
}: {
  notice: TenderNoticeDetail;
  tender: NoticeTender;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const { file, url, isPending, error } = useNoticeDocumentUrl(
    notice.id,
    // Not before it is asked for: this is a multi-megabyte scan, and the
    // review screen is useful without it.
    open,
  );

  // Closing clears the filter. The component stays mounted between openings,
  // and a filter left behind from last time would silently hide lines from
  // someone who came back to check ALL of them.
  const close = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    // The page behind must not scroll under a full-height dialog.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  if (!open) return null;

  const needle = query.trim().toLowerCase();
  const items = needle
    ? tender.items.filter((item) =>
        [item.raw_name, item.specification, item.remarks]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle)),
      )
    : tender.items;

  const filename = notice.original_filename ?? "notice.pdf";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Check item names against the document — ${tender.reference_no ?? tender.name}`}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div className="relative flex h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-xl sm:max-w-[1600px] sm:rounded-2xl">
        <header className="flex items-start gap-3 border-b border-border/60 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
            <FileText className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight tracking-tight text-foreground">
              Item names against the document
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              <span className="font-mono font-bold text-foreground">
                {tender.reference_no ?? tender.name}
              </span>{" "}
              · {tender.item_count} line
              {tender.item_count === 1 ? "" : "s"} ·{" "}
              {notice.extraction_method
                ? (EXTRACTION_METHOD_LABEL[notice.extraction_method] ??
                  notice.extraction_method)
                : "method unknown"}
              {isGuessedText(notice.extraction_method)
                ? " — every character is a guess, so read them against the page"
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Names left, page right. The document gets the larger share: it is
            the thing being read closely, and a scan is unreadable narrow. */}
        <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 p-3 lg:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)] lg:grid-rows-1">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60">
            <div className="border-b border-border/60 bg-secondary/40 p-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a line…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>

            <ol className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
              {items.length === 0 ? (
                <li className="p-6 text-center text-xs font-medium text-muted-foreground">
                  No line matches “{query}”.
                </li>
              ) : (
                items.map((item) => <RawItemRow key={item.id} item={item} />)
              )}
            </ol>
          </section>

          <NoticeDocumentFrame
            url={url}
            file={file}
            filename={filename}
            isPending={isPending}
            error={error}
            className="min-h-0"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * One extracted line.
 *
 * The name is set in mono because that is what is being proof-read: a
 * proportional face hides exactly the confusions OCR makes — `1` against `l`,
 * `0` against `O`, `rn` against `m`.
 */
function RawItemRow({ item }: { item: NoticeTenderItem }) {
  return (
    <li className="flex gap-3 px-3 py-2.5">
      <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-muted-foreground">
        {item.line_no}
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words font-mono text-sm font-semibold leading-snug text-foreground">
          {item.raw_name}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.specification && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
              {item.specification}
            </span>
          )}
          {item.quantity && (
            <span className="text-[11px] font-medium text-muted-foreground">
              {item.quantity}
              {item.quantity_unit ? ` ${item.quantity_unit}` : ""}
            </span>
          )}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset",
              MAPPING_STATUS_STYLE[item.mapping_status],
            )}
          >
            {MAPPING_STATUS_LABEL[item.mapping_status]}
          </span>
        </div>

        {/* Kept subordinate on purpose. The catalogue name is a different
            string from the notice's wording, and mistaking one for the other
            is the error this screen exists to catch. */}
        {item.matched_product && (
          <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
            → matched to {item.matched_product.name_en}
            {item.matched_product.cas_number
              ? ` · CAS ${item.matched_product.cas_number}`
              : ""}
          </p>
        )}
      </div>
    </li>
  );
}
