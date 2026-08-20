"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  LayoutGrid,
  List,
  Loader2,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/search/filter-panel";
import { ResultCard } from "@/components/search/result-card";
import { ResultRowCompact } from "@/components/search/result-row-compact";
import {
  PAGE_SIZES,
  ResultsPagination,
} from "@/components/search/results-pagination";
import {
  EMPTY_FILTERS,
  MATERIAL_TYPE_LABEL,
  SORT_OPTIONS,
  applyFilters,
  countActiveFilters,
  facetsFor,
  sortRows,
  toRows,
  type FacetKind,
  type FilterState,
  type SortValue,
} from "@/lib/search-facets";
import {
  groupMemberships,
  shortlistKey,
} from "@/components/tenders/shortlist-menu";
import { useSearch, useShortlistMemberships } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import type { MaterialType } from "@/types/domain";
import type { SearchStrategy } from "@/types/api";

/**
 * Catalogue search (FR-SEARCH-01).
 *
 * The query ladder — exact CAS → exact name → substring → trigram — runs
 * server-side (services/search.py); this screen presents what comes back as a
 * flat list of offers (one card per product/supplier pair, see
 * `lib/search-facets.ts`) with a faceted rail beside it.
 *
 * Facets, sorting, and paging are client-side because `/search` returns the
 * whole matched page at once — every count in the rail is derived from rows
 * already in hand, so no checkbox costs a round trip. If the API ever paginates
 * its results, all three have to move server-side together.
 */
const STRATEGY_NOTE: Record<SearchStrategy, string> = {
  empty: "",
  cas_exact: "Matched on an exact CAS number.",
  exact_name: "Exact name match, with related products included.",
  partial: "Matched by name, CAS, or synonym.",
  fuzzy: "No exact match — showing the closest results (typo-tolerant).",
};

const FACET_CHIP_LABEL: Record<FacetKind, string> = {
  category: "Category",
  country: "Country",
  standard: "Standard",
};

export default function SearchPage() {
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);
  // Submitting commits the current text straight away instead of waiting out
  // the debounce; typing falls back to the debounced value.
  const [committed, setCommitted] = useState("");
  const query = term === committed ? committed : debounced;

  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortValue>("relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [collapsed, setCollapsed] = useState(false);
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  const { data, isFetching, error } = useSearch(query);
  const hasQuery = query.trim().length > 0;

  const rows = useMemo(() => toRows(data), [data]);
  const facets = useMemo(() => facetsFor(rows, applied), [rows, applied]);
  const filtered = useMemo(() => applyFilters(rows, applied), [rows, applied]);
  const sorted = useMemo(() => sortRows(filtered, sort), [filtered, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = page > pageCount ? 1 : page;
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  // Which tenders the rows on this page already sit on. Fetched once for the
  // whole page and handed to each card, rather than each Shortlist button
  // asking for itself — that would be one request per result row.
  const visibleProductIds = useMemo(
    () => visible.map((row) => row.product.id),
    [visible],
  );
  const { data: memberships } = useShortlistMemberships(visibleProductIds);
  const membershipsByRow = useMemo(
    () => groupMemberships(memberships),
    [memberships],
  );

  // A new query invalidates the old facets entirely — different products,
  // different suppliers — so the filters and the page reset with it. Done
  // during render rather than in an effect (React's "adjusting state when a
  // prop changes" pattern): an effect would paint one frame of the new
  // results still wearing the previous query's filters.
  const [queryOnScreen, setQueryOnScreen] = useState(query);
  if (queryOnScreen !== query) {
    setQueryOnScreen(query);
    setApplied(EMPTY_FILTERS);
    setDraft(EMPTY_FILTERS);
    setPage(1);
  }

  const activeCount = countActiveFilters(applied);

  // Every control that changes *what* is listed sends the reader back to page
  // one — staying on page 6 of a set that just shrank to two pages is how a
  // filter comes to look like it returned nothing.
  function changeFilters(next: FilterState) {
    setApplied(next);
    setDraft(next);
    setPage(1);
  }

  function removeFilter(kind: FacetKind, value: string) {
    changeFilters({ ...applied, [kind]: applied[kind].filter((v) => v !== value) });
  }

  function resetFilters() {
    changeFilters(EMPTY_FILTERS);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Search
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Find products, manufacturers, and contacts across the entire catalogue.
        </p>
      </div>

      {/* Query bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCommitted(term);
        }}
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by product name, CAS, supplier, country…"
            aria-label="Search the catalogue"
            className="h-10 w-full rounded-xl border border-input bg-card pl-11 pr-11 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          />
          {isFetching ? (
            <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
          ) : (
            term && (
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  setCommitted("");
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" strokeWidth={2.5} />
              </button>
            )
          )}
        </div>

        <Button type="submit" className="h-10 px-7">
          <SearchIcon strokeWidth={2.25} />
          Search
        </Button>
        <Button type="button" variant="outline" className="h-10 px-6">
          <Bookmark strokeWidth={2.25} />
          Save Search
        </Button>
      </form>

      {/* Applied filters */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(EMPTY_FILTERS) as FacetKind[]).flatMap((kind) =>
            applied[kind].map((value) => (
              <button
                key={`${kind}-${value}`}
                type="button"
                onClick={() => removeFilter(kind, value)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/8 py-1.5 pl-3 pr-2 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/10 transition-colors hover:bg-primary/15"
              >
                {FACET_CHIP_LABEL[kind]}:{" "}
                {kind === "category"
                  ? MATERIAL_TYPE_LABEL[value as MaterialType] ?? value
                  : value}
                <X className="size-3.5" strokeWidth={2.75} />
              </button>
            )),
          )}
          <button
            type="button"
            onClick={resetFilters}
            className="px-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <AlertCircle className="size-5" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-destructive">Search failed</p>
            <p className="text-xs font-medium text-muted-foreground">
              {error instanceof Error ? error.message : "Unexpected error occurred."}
            </p>
          </div>
        </div>
      )}

      {!hasQuery && <StartHint />}

      {/* The very first search of the session, before any data has landed.
          After that `keepPreviousData` means `data` is never undefined again. */}
      {hasQuery && isFetching && !data && <SearchLoading />}

      {hasQuery && data && (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Filters: a rail on desktop, a disclosure on phones */}
          <div className={cn("lg:block", filtersOpenMobile ? "block" : "hidden")}>
            <FilterPanel
              facets={facets}
              applied={applied}
              draft={draft}
              onDraftChange={setDraft}
              onApply={() => changeFilters(draft)}
              onReset={resetFilters}
              collapsed={collapsed}
              onCollapsedChange={setCollapsed}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            {/* Result count, sort, and view */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  About{" "}
                  <span className="font-bold tabular-nums text-foreground">
                    {total.toLocaleString()}
                  </span>{" "}
                  result{total === 1 ? "" : "s"} found for{" "}
                  <span className="font-bold text-foreground">
                    &ldquo;{data.query}&rdquo;
                  </span>
                </p>
                {data.strategy !== "empty" && data.total > 0 && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-success">
                    <Sparkles className="size-3.5 shrink-0" strokeWidth={2.25} />
                    {STRATEGY_NOTE[data.strategy]}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltersOpenMobile((open) => !open)}
                  className="h-9 lg:hidden"
                >
                  <SlidersHorizontal strokeWidth={2.25} />
                  Filters
                  {activeCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums text-primary-foreground">
                      {activeCount}
                    </span>
                  )}
                </Button>

                <label className="hidden items-center gap-2 sm:flex">
                  <span className="text-xs font-medium text-muted-foreground">Sort by:</span>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value as SortValue);
                      setPage(1);
                    }}
                    className="h-9 cursor-pointer rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm">
                  <ViewToggle
                    active={view === "grid"}
                    onClick={() => setView("grid")}
                    label="Detailed cards"
                    icon={<LayoutGrid className="size-4" strokeWidth={2.25} />}
                  />
                  <ViewToggle
                    active={view === "list"}
                    onClick={() => setView("list")}
                    label="Compact list"
                    icon={<List className="size-4" strokeWidth={2.25} />}
                  />
                </div>
              </div>
            </div>

            {/* Results — dimmed rather than unmounted while a new query is in
                flight, so re-searching never flashes the list back to empty. */}
            <div className="relative">
              {isFetching && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute inset-x-0 -top-2 z-10 flex justify-center"
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-md">
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    Updating results…
                  </span>
                </div>
              )}

              <div
                className={cn(
                  "transition-opacity duration-200",
                  isFetching && "pointer-events-none opacity-50",
                )}
              >
                {total === 0 ? (
                  <NoResults query={data.query} filtered={activeCount > 0} onReset={resetFilters} />
                ) : view === "grid" ? (
                  <div className="space-y-4">
                    {visible.map((row) => (
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
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
                    {/* Deliberately not `overflow-hidden`: it would clip the
                        Shortlist dropdown on every row. The rows round their
                        own first/last corners instead, which is all the
                        clipping was doing here. */}
                    {visible.map((row) => (
                      <ResultRowCompact
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
                )}
              </div>
            </div>

            {total > 0 && (
              <ResultsPagination
                page={current}
                pageCount={pageCount}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function SearchLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-12 text-center"
    >
      <Loader2 className="size-8 animate-spin text-primary" strokeWidth={2} />
      <p className="text-sm font-semibold text-muted-foreground">
        Searching the catalogue…
      </p>
    </div>
  );
}

function StartHint() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-secondary/40 to-secondary/20 p-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <SearchIcon className="size-8" strokeWidth={2} />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-foreground">Start searching the catalogue</h2>
        <p className="max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
          Every match shows its manufacturers and their contact details — no need to
          open a second screen.
        </p>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {["CAS exact match", "Synonym support", "Typo-tolerant", "Multi-language"].map(
          (hint) => (
            <span
              key={hint}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-xs"
            >
              {hint}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/** Distinguishes "the catalogue has nothing" from "your filters excluded
 *  everything" — the second one is recoverable and needs a way out. */
function NoResults({
  query,
  filtered,
  onReset,
}: {
  query: string;
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
        <SearchIcon className="size-7" strokeWidth={2} />
      </div>
      <div className="space-y-2">
        <p className="text-base font-bold text-foreground">
          {filtered
            ? "No results match these filters"
            : `No results for “${query}”`}
        </p>
        <p className="max-w-md text-sm font-medium text-muted-foreground">
          {filtered
            ? "Every match was excluded by the filters on the left. Loosen one to see them again."
            : "Nothing matched by name, CAS, or synonym — even allowing for typos. Try a different search term."}
        </p>
      </div>
      {filtered && (
        <Button variant="outline" onClick={onReset}>
          Reset filters
        </Button>
      )}
    </div>
  );
}
