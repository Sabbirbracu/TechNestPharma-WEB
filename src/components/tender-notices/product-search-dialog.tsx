"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search as SearchIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ResultCard } from "@/components/search/result-card";
import {
  groupMemberships,
  shortlistKey,
} from "@/components/tenders/shortlist-menu";
import { useSearch, useShortlistMemberships } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { toRows } from "@/lib/search-facets";

/**
 * The catalogue search, opened from a matched product on the review screen.
 *
 * Clicking the match used to navigate to `/products?q=…`, which abandoned a
 * half-finished review to answer a question as small as "who actually supplies
 * this, and at what price?". The same question, asked in place, keeps the
 * tender on screen behind it.
 *
 * Results are the search page's own `ResultCard` — not a smaller copy of it.
 * The card already answers the five questions a buyer has about a supplier
 * offer, including the shortlist control, and a second implementation would
 * drift from it within a release.
 */
export function ProductSearchDialog({
  initialQuery,
  open,
  onClose,
}: {
  /** What to search on opening — the matched product's name. */
  initialQuery: string;
  open: boolean;
  onClose: () => void;
}) {
  // `null` means "nobody has typed yet", so the box falls back to the product
  // the row was opened from. Derived rather than copied into state on open,
  // which would need an effect to re-arm and would briefly show the previous
  // row's query.
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? initialQuery;

  const close = useCallback(() => {
    setTyped(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  // Typing is debounced; the opening query is not, so the first result set is
  // already arriving while the dialog animates in.
  const debounced = useDebounced(query, 300);
  const effective = open ? (debounced.trim() || initialQuery.trim()) : "";
  const { data, isFetching, error } = useSearch(effective);

  const rows = useMemo(() => toRows(data), [data]);
  const productIds = useMemo(
    () => [...new Set(rows.map((row) => row.product.id))],
    [rows],
  );
  const { data: memberships } = useShortlistMemberships(productIds);
  const membershipsByRow = useMemo(
    () => groupMemberships(memberships),
    [memberships],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Catalogue search — ${initialQuery}`}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-xl sm:max-w-6xl sm:rounded-2xl">
        <header className="flex items-center gap-3 border-b border-border/60 p-4">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Search the catalogue by name or CAS…"
              autoFocus
              className="h-10 pl-9"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-secondary/20 p-4">
          {/* Results first, error second: a failed refetch on top of results
              we already have is a reason to leave them on screen, not to
              replace them with an apology. */}
          {rows.length === 0 && error ? (
            <p className="p-8 text-center text-sm font-medium text-destructive">
              The search failed. Try again.
            </p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm font-medium text-muted-foreground">
              {isFetching
                ? "Searching…"
                : `Nothing in the catalogue matches “${effective}”.`}
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs font-bold text-muted-foreground">
                {rows.length} supplier offer{rows.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-4">
                {rows.map((row) => (
                  <ResultCard
                    key={row.key}
                    row={row}
                    memberships={
                      membershipsByRow.get(
                        shortlistKey(row.product.id, row.supplier.company_id),
                      ) ?? []
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
