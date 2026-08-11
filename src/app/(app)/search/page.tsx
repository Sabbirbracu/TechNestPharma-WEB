"use client";

import { useState } from "react";
import { Search as SearchIcon, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useSearch } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { ProductResultCard } from "@/components/search/product-result-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SearchStrategy } from "@/types/api";

/**
 * Premium product search interface (FR-SEARCH-01). 
 * The query ladder — exact CAS → exact name → substring → trigram — runs 
 * server-side (services/search.py). Every match shows its suppliers and 
 * their contact details inline.
 */
const STRATEGY_LABEL: Record<SearchStrategy, string> = {
  empty: "",
  cas_exact: "Exact CAS match",
  exact_name: "Exact match, with related products",
  partial: "Matched by name, CAS, or synonym",
  fuzzy: "No exact match — showing closest results (typo-tolerant)",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 250);
  const { data, isFetching, error } = useSearch(debounced);

  const hasQuery = debounced.trim().length > 0;

  return (
    <>
      <PageHeader
        title="Global Search"
        description="Find products, suppliers, and contacts instantly across the entire catalogue."
      />

      {/* Premium search input */}
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, CAS number, or synonym..."
            className="h-14 pl-12 pr-12 text-base shadow-lg ring-1 ring-border/50"
            aria-label="Search products"
          />
          {isFetching && (
            <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-primary" />
          )}
        </div>
        
        {/* Search info banner */}
        {hasQuery && data && data.strategy !== "empty" && data.total > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-success/20 bg-success/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-success" />
              <p className="text-sm font-semibold text-success">
                {STRATEGY_LABEL[data.strategy]}
              </p>
            </div>
            <Badge variant="success" className="font-bold tabular-nums">
              {data.total} result{data.total === 1 ? "" : "s"}
            </Badge>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 shadow-sm"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <AlertCircle className="size-5" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-destructive">Search failed</p>
            <p className="text-xs font-medium text-muted-foreground">
              {error instanceof Error ? error.message : "Unexpected error occurred."}
            </p>
          </div>
        </div>
      )}

      {/* Start hint */}
      {!hasQuery && <StartHint />}

      {/* Empty result */}
      {hasQuery && data && data.total === 0 && !isFetching && (
        <EmptyResult query={data.query} />
      )}

      {/* Results */}
      {hasQuery && data && data.total > 0 && (
        <div className="mx-auto mt-8 max-w-4xl space-y-5">
          {data.products.map((product) => (
            <ProductResultCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}

function StartHint() {
  return (
    <div className="mx-auto mt-12 max-w-3xl">
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border bg-gradient-to-br from-secondary/40 to-secondary/20 p-12 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <SearchIcon className="size-8" strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">Start searching the catalogue</h3>
          <p className="max-w-md text-sm font-medium text-muted-foreground leading-relaxed">
            Every match shows suppliers and their contact details — no need to open a second screen.
          </p>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="font-semibold">CAS exact match</Badge>
          <Badge variant="outline" className="font-semibold">Synonym support</Badge>
          <Badge variant="outline" className="font-semibold">Typo-tolerant</Badge>
          <Badge variant="outline" className="font-semibold">Multi-language</Badge>
        </div>
      </div>
    </div>
  );
}

function EmptyResult({ query }: { query: string }) {
  return (
    <div className="mx-auto mt-12 max-w-2xl">
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
          <SearchIcon className="size-7" strokeWidth={2} />
        </div>
        <div className="space-y-2">
          <p className="text-base font-bold text-foreground">
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="max-w-md text-sm font-medium text-muted-foreground">
            Nothing matched by name, CAS, or synonym — even allowing for typos. Try a different search term.
          </p>
        </div>
      </div>
    </div>
  );
}
