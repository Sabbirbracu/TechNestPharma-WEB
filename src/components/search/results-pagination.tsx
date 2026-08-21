"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const PAGE_SIZES = [10, 20, 50, 240] as const;

/**
 * Numbered pager for the results screen. Windowed around the current page with
 * ellipses, so a 40-page result set never overflows the row.
 */
export function ResultsPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = "results",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** "results", "tenders", … — the noun after the count. */
  itemLabel?: string;
}) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 pt-2 sm:flex-row">
      <div className="flex items-center gap-1.5">
        <PageButton
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" strokeWidth={2.5} />
        </PageButton>

        {pageWindow(page, pageCount).map((entry, i) =>
          entry === "gap" ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="px-1 text-sm font-semibold text-muted-foreground/60"
            >
              …
            </span>
          ) : (
            <PageButton
              key={entry}
              onClick={() => onPageChange(entry)}
              active={entry === page}
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? "page" : undefined}
            >
              {entry}
            </PageButton>
          ),
        )}

        <PageButton
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" strokeWidth={2.5} />
        </PageButton>
      </div>

      <div className="flex items-center gap-4">
        <p className="text-xs font-medium text-muted-foreground">
          Showing <span className="font-bold tabular-nums text-foreground">{first}</span> to{" "}
          <span className="font-bold tabular-nums text-foreground">{last}</span> of{" "}
          <span className="font-bold tabular-nums text-foreground">{total}</span>{" "}
          {itemLabel}
        </p>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Results per page"
          className="h-9 cursor-pointer rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PageButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-9 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/60",
        className,
      )}
      {...props}
    />
  );
}

/** First and last page always shown, three around the current one, ellipses
 *  for the gaps — the shape the mockup pages through (1 2 3 … 9). */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const pages = new Set([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= pageCount - 2)
    [pageCount - 1, pageCount - 2, pageCount - 3].forEach((p) => pages.add(p));

  const ordered = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && ordered[i] - ordered[i - 1] > 1) out.push("gap");
    out.push(ordered[i]);
  }
  return out;
}
