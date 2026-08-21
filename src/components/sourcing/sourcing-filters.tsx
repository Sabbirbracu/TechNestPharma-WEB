"use client";

import { useState } from "react";
import { ListFilter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type SourcingFilterValues = {
  q: string;
  /** "" = both, "true" = speculative only, "false" = tender-backed only. */
  untendered: "" | "true" | "false";
};

export const EMPTY_SOURCING_FILTERS: SourcingFilterValues = {
  q: "",
  untendered: "",
};

/**
 * Edits are held as a draft and committed by Apply, matching the products
 * screen — the design puts an explicit Apply button on screen, and a query per
 * keystroke is wasted work here. Enter in the search box commits too, because
 * typing then reaching for a button is what would make this feel slow.
 */
export function SourcingFilters({
  value,
  onChange,
}: {
  value: SourcingFilterValues;
  onChange: (next: SourcingFilterValues) => void;
}) {
  const [draft, setDraft] = useState(value);

  const dirty = draft.q !== value.q || draft.untendered !== value.untendered;

  const active = value.q !== "" || value.untendered !== "";

  const apply = () => onChange(draft);

  const clear = () => {
    setDraft(EMPTY_SOURCING_FILTERS);
    onChange(EMPTY_SOURCING_FILTERS);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_auto] lg:items-end">
        <div className="relative">
          <Input
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply();
            }}
            placeholder="Search by product, supplier, CAS…"
            aria-label="Search sourcing requests"
            className="pr-10"
          />
          <Search
            aria-hidden
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
        </div>

        <Field label="Related To" htmlFor="sourcing-related">
          <Select
            id="sourcing-related"
            value={draft.untendered}
            onChange={(event) =>
              setDraft({
                ...draft,
                untendered: event.target.value as SourcingFilterValues["untendered"],
              })
            }
          >
            <option value="">All Requests</option>
            <option value="false">Tender-backed</option>
            <option value="true">Speculative</option>
          </Select>
        </Field>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
            onClick={clear}
            disabled={!active && !dirty}
            className="flex-1 lg:flex-none"
          >
            Clear
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!dirty}
            className="flex-1 lg:flex-none"
          >
            Apply Filters
            <ListFilter strokeWidth={2.25} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-semibold text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
