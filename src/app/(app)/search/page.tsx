"use client";

import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Single search box over companies, products, synonyms, and contacts
 * (FR-SEARCH-01). The query pipeline — exact CAS → exact name → full-text →
 * trigram — lives server-side (05-architecture §B4); this screen owns input,
 * debounce, and grouped result rendering once the API is wired.
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader
        title="Search"
        description="One box across companies, products, synonyms, and contacts."
      />

      <div className="relative max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try a product, CAS number, company, or synonym…"
          className="h-11 pl-9 text-base"
          aria-label="Search the catalogue"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">CAS exact match</Badge>
        <Badge variant="secondary">Synonym → canonical</Badge>
        <Badge variant="secondary">Trigram / typo-tolerant</Badge>
        <Badge variant="secondary">CJK local-script</Badge>
      </div>

      {query.trim() === "" ? (
        <EmptyState
          icon={SearchIcon}
          title="Start typing to search"
          description="Results are grouped by companies, products, and contacts. A CAS number returns every supplier of that substance."
        />
      ) : (
        <EmptyState
          icon={SearchIcon}
          title={`No results for “${query}”`}
          description="Search is not connected to the API yet — this screen renders grouped results once the backend is live."
        />
      )}
    </>
  );
}
