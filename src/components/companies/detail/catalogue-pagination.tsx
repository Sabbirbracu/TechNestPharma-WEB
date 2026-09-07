"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/components/search/results-pagination";
import { cn } from "@/lib/utils";

/**
 * The catalogue's footer: the count on the left, numbered pages on the right.
 *
 * The shared `ResultsPagination` puts the pages first and carries a page-size
 * select, neither of which this card has room for — the windowing logic is
 * shared, the chrome is not.
 */
export function CataloguePagination({
  page,
  pageCount,
  total,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-4 pt-4 sm:flex-row">
      <p className="text-[13px] font-medium text-muted-foreground">
        Showing <span className="font-bold tabular-nums text-foreground">{first}</span>{" "}
        to <span className="font-bold tabular-nums text-foreground">{last}</span> of{" "}
        <span className="font-bold tabular-nums text-foreground">{total}</span>{" "}
        {itemLabel}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-1.5">
          <PageButton
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" strokeWidth={2.5} />
          </PageButton>

          {pageWindow(page, pageCount).map((entry, index) =>
            entry === "gap" ? (
              <span
                key={`gap-${index}`}
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
      ) : null}
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
        "flex size-9 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40 disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-success bg-success text-success-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-success/40 hover:bg-success/5",
        className,
      )}
      {...props}
    />
  );
}
