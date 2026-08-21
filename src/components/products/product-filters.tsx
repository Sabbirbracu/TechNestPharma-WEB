"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_FILTER_OPTIONS } from "./product-taxonomy";
import type { MaterialType } from "@/types/domain";

/** The committed filter state the table queries on. */
export type ProductFilterValues = {
  q: string;
  /** Any supplier offers the product as this material type. */
  materialType: MaterialType | "";
  /** "" = both. Packaging is identified by a spec row, not a column (D14). */
  isPackaging: "" | "true" | "false";
};

export const EMPTY_FILTERS: ProductFilterValues = {
  q: "",
  materialType: "",
  isPackaging: "",
};

/**
 * The filter bar.
 *
 * Edits are held as a draft and committed by Apply, rather than each keystroke
 * refetching — the design puts an explicit Apply button on screen, and a
 * catalogue this size makes a query per keystroke expensive. Enter in the
 * search box commits too, because typing then reaching for a button is the
 * one thing that would make this feel slow.
 */
export function ProductFilters({
  value,
  onChange,
}: {
  value: ProductFilterValues;
  onChange: (next: ProductFilterValues) => void;
}) {
  const [draft, setDraft] = useState(value);

  const dirty =
    draft.q !== value.q ||
    draft.materialType !== value.materialType ||
    draft.isPackaging !== value.isPackaging;

  const active =
    value.q !== "" || value.materialType !== "" || value.isPackaging !== "";

  const apply = () => onChange(draft);

  const clear = () => {
    setDraft(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_200px_auto] lg:items-end">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply();
            }}
            placeholder="Search by product name, CAS, category, or keywords..."
            aria-label="Search products by name, CAS, or synonym"
            className="pl-10 pr-16"
          />
          <kbd className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <Field label="Category" htmlFor="product-category">
          <Select
            id="product-category"
            value={draft.materialType}
            onChange={(event) =>
              setDraft({
                ...draft,
                materialType: event.target.value as MaterialType | "",
              })
            }
          >
            <option value="">All Categories</option>
            {CATEGORY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Product Type" htmlFor="product-type">
          <Select
            id="product-type"
            value={draft.isPackaging}
            onChange={(event) =>
              setDraft({
                ...draft,
                isPackaging: event.target.value as ProductFilterValues["isPackaging"],
              })
            }
          >
            <option value="">All Types</option>
            <option value="false">Chemicals</option>
            <option value="true">Packaging Materials</option>
          </Select>
        </Field>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={clear}
            disabled={!active && !dirty}
            className="flex-1 lg:flex-none"
          >
            Clear Filters
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!dirty}
            className="flex-1 lg:flex-none"
          >
            Apply Filters
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
