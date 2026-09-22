"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DocSource, DocType } from "@/types/api";
import { DOC_FAMILIES, DOC_TYPES, SOURCE_LABELS } from "./doc-taxonomy";

/**
 * Search, five dropdowns, and the tab strip.
 *
 * The dropdowns are committed live rather than behind an Apply button — unlike
 * the products filter bar, which guards a 2,000-row catalogue against a query
 * per keystroke. Here only the free-text box waits for Enter or the search
 * button; picking a supplier is one deliberate click and should show its result
 * immediately.
 */

export type DateRange = "" | "7d" | "30d" | "90d" | "year";

export const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "", label: "All Time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

export type DocumentTab =
  | "all"
  | "recent"
  | "email"
  | "tender"
  | "regulatory"
  | "commercial"
  | "images";

export type TabDefinition = {
  value: DocumentTab;
  label: string;
  count: number | undefined;
};

export type FilterValues = {
  docType: DocType | "";
  companyId: string;
  productId: string;
  source: DocSource | "";
  dateRange: DateRange;
};

export const EMPTY_FILTERS: FilterValues = {
  docType: "",
  companyId: "",
  productId: "",
  source: "",
  dateRange: "",
};

export function DocumentFilterBar({
  search,
  onSearchChange,
  onSearchCommit,
  filters,
  onFiltersChange,
  onReset,
  suppliers,
  products,
  tabs,
  activeTab,
  onTabChange,
  dirty,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchCommit: () => void;
  filters: FilterValues;
  onFiltersChange: (next: FilterValues) => void;
  onReset: () => void;
  suppliers: { id: number; name: string }[];
  products: { id: number; name: string }[];
  tabs: TabDefinition[];
  activeTab: DocumentTab;
  onTabChange: (tab: DocumentTab) => void;
  dirty: boolean;
}) {
  // Phones only: the five dropdowns fold behind the Filters button, or they
  // push the documents a full screen down. From lg they are always shown.
  const [showFilters, setShowFilters] = useState(false);
  const activeCount = Object.values(filters).filter((value) => value !== "").length;

  function set<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            type="search"
            enterKeyHint="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchCommit();
            }}
            placeholder="Search by name, supplier, product…"
            aria-label="Search documents"
            className="h-11 pl-11"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            variant="outline"
            className="h-11 flex-1 lg:flex-none"
            onClick={onReset}
            disabled={!dirty}
          >
            <RotateCcw />
            Reset
          </Button>
          <Button
            variant="outline"
            className="hidden h-11 lg:inline-flex"
            onClick={onSearchCommit}
          >
            <SlidersHorizontal />
            Filters
            <ChevronDown className="opacity-60" />
          </Button>
          <Button
            variant="outline"
            className={cn(
              "h-11 flex-1 lg:hidden",
              activeCount > 0 && "border-primary/50 text-primary",
            )}
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            aria-controls="document-filters"
          >
            <SlidersHorizontal />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[11px] font-bold tabular-nums">
                {activeCount}
              </span>
            )}
            <ChevronDown
              className={cn("opacity-60 transition-transform", showFilters && "rotate-180")}
            />
          </Button>
        </div>
      </div>

      <div
        id="document-filters"
        className={cn(
          "mt-4 grid-cols-2 gap-3 lg:grid lg:grid-cols-3 xl:grid-cols-5",
          showFilters ? "grid" : "hidden",
        )}
      >
        <Field label="Document Type" htmlFor="doc-type" wide>
          <Select
            id="doc-type"
            value={filters.docType}
            onChange={(event) => set("docType", event.target.value as DocType | "")}
          >
            <option value="">All Types</option>
            {DOC_FAMILIES.map((family) => (
              <optgroup key={family.value} label={family.label}>
                {DOC_TYPES.filter((type) => type.family === family.value).map(
                  (type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ),
                )}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Supplier" htmlFor="doc-supplier" wide>
          <Select
            id="doc-supplier"
            value={filters.companyId}
            onChange={(event) => set("companyId", event.target.value)}
          >
            <option value="">All Suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={String(supplier.id)}>
                {supplier.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Product" htmlFor="doc-product" wide>
          <Select
            id="doc-product"
            value={filters.productId}
            onChange={(event) => set("productId", event.target.value)}
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={String(product.id)}>
                {product.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Source" htmlFor="doc-source">
          <Select
            id="doc-source"
            value={filters.source}
            onChange={(event) => set("source", event.target.value as DocSource | "")}
          >
            <option value="">All Sources</option>
            {(["manual", "email", "tender", "import"] as const).map((value) => (
              <option key={value} value={value}>
                {SOURCE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Date Range" htmlFor="doc-range">
          <Select
            id="doc-range"
            value={filters.dateRange}
            onChange={(event) => set("dateRange", event.target.value as DateRange)}
          >
            {DATE_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* One swipeable line on a phone instead of four wrapped rows; the
          negative margin lets it scroll to the card's edge. */}
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            aria-pressed={tab.value === activeTab}
            className={cn(
              "shrink-0 rounded-xl border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              tab.value === activeTab
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/12 dark:text-blue-300"
                : "border-transparent bg-secondary text-muted-foreground hover:bg-accent/70 hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1 tabular-nums opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  wide = false,
  children,
}: {
  label: string;
  htmlFor: string;
  /** Full width in the phone's two-column grid — for pickers whose options
   *  are long names. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", wide && "col-span-2 sm:col-span-1")}>
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
