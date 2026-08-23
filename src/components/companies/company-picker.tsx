"use client";

import { useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanies } from "@/lib/queries";
import type { CompanyListItem } from "@/types/api";

/**
 * Search-as-you-type company lookup. A plain `<select>` doesn't scale to a
 * catalogue with hundreds of suppliers, so this hits the same paginated
 * `/companies` list the Companies page uses, filtered server-side by name.
 *
 * Shared by anything that needs to attach a record to an existing company —
 * the product create form and the standalone "Add Contact" dialog both use
 * this rather than each rolling their own.
 */
export function CompanyPicker({
  value,
  onChange,
}: {
  value: CompanyListItem | null;
  onChange: (company: CompanyListItem | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useCompanies({
    q: query,
    size: 8,
    sort: "name_en",
    order: "asc",
  });
  const results = data?.items ?? [];

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-input bg-secondary/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Check className="size-4" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {value.name_en}
            </p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {[value.short_name, value.country?.name]
                .filter(Boolean)
                .join(" · ") || "Selected supplier"}
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          placeholder="Search companies by name…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="pl-10"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
          {isFetching ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs italic text-muted-foreground">
              No company matches &ldquo;{query}&rdquo;.
            </p>
          ) : (
            results.map((company) => (
              <button
                key={company.id}
                type="button"
                // Fires before blur closes the list, so the click still lands.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(company);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent/60"
              >
                <span className="text-sm font-semibold text-foreground">
                  {company.name_en}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {[company.short_name, company.country?.name]
                    .filter(Boolean)
                    .join(" · ") || "No further details on file"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
