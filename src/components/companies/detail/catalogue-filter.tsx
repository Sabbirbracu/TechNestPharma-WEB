"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { AnchoredPopover, useDismiss } from "@/components/ui/anchored-popover";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORY_FILTER_OPTIONS } from "@/components/products/product-taxonomy";
import { cn } from "@/lib/utils";
import { OUTLINE_BUTTON } from "@/components/companies/detail/section-card";
import type { MarketSegment, MaterialType } from "@/types/domain";

export type CatalogueFilters = {
  materialType: MaterialType | "";
  marketSegment: MarketSegment | "";
  sterileOnly: boolean;
};

export const EMPTY_CATALOGUE_FILTERS: CatalogueFilters = {
  materialType: "",
  marketSegment: "",
  sterileOnly: false,
};

export function activeFilterCount(filters: CatalogueFilters): number {
  return (
    (filters.materialType ? 1 : 0) +
    (filters.marketSegment ? 1 : 0) +
    (filters.sterileOnly ? 1 : 0)
  );
}

const SEGMENT_OPTIONS: { value: MarketSegment; label: string }[] = [
  { value: "human", label: "Human" },
  { value: "veterinary", label: "Veterinary" },
  { value: "both", label: "Both" },
];

/**
 * The catalogue's "Filter" button and its panel.
 *
 * Only the three facets `/offers` narrows on server-side are offered — a
 * filter that quietly paginates over a client-side subset gives a wrong count
 * in the footer, which is the one number on this card people quote.
 */
export function CatalogueFilter({
  filters,
  onChange,
}: {
  filters: CatalogueFilters;
  onChange: (filters: CatalogueFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const count = activeFilterCount(filters);

  useDismiss(open, () => setOpen(false), [trigger, panel]);

  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={cn(OUTLINE_BUTTON, count > 0 && "border-success/50 bg-success/5")}
      >
        <Filter strokeWidth={2.2} />
        Filter
        {count > 0 ? (
          <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-success text-[11px] font-bold text-success-foreground">
            {count}
          </span>
        ) : null}
      </button>

      <AnchoredPopover anchor={trigger} open={open} align="end">
        <div
          ref={setPanel}
          role="dialog"
          aria-label="Filter the catalogue"
          className="w-72 rounded-xl border border-border/60 bg-popover p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filter products
            </p>
            {count > 0 ? (
              <button
                type="button"
                onClick={() => onChange(EMPTY_CATALOGUE_FILTERS)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" strokeWidth={2.4} />
                Clear
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Material type
              </span>
              <Select
                value={filters.materialType}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    materialType: event.target.value as MaterialType | "",
                  })
                }
                className="h-9 text-[13px]"
              >
                <option value="">Any material type</option>
                {CATEGORY_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Market segment
              </span>
              <Select
                value={filters.marketSegment}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    marketSegment: event.target.value as MarketSegment | "",
                  })
                }
                className="h-9 text-[13px]"
              >
                <option value="">Any segment</option>
                {SEGMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 pt-0.5">
              <Checkbox
                checked={filters.sterileOnly}
                onChange={(event) =>
                  onChange({ ...filters, sterileOnly: event.target.checked })
                }
              />
              <span className="text-[13px] font-medium text-foreground">
                Sterile products only
              </span>
            </label>
          </div>
        </div>
      </AnchoredPopover>
    </>
  );
}
