"use client";

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
  function set<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchCommit();
            }}
            placeholder="Search documents by name, supplier, product, etc..."
            aria-label="Search documents"
            className="h-11 pl-11"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button
            variant="outline"
            className="h-11"
            onClick={onReset}
            disabled={!dirty}
          >
            <RotateCcw />
            Reset
          </Button>
          <Button variant="outline" className="h-11" onClick={onSearchCommit}>
            <SlidersHorizontal />
            Filters
            <ChevronDown className="opacity-60" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Field label="Document Type" htmlFor="doc-type">
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

        <Field label="Supplier" htmlFor="doc-supplier">
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

        <Field label="Product" htmlFor="doc-product">
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

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            aria-pressed={tab.value === activeTab}
            className={cn(
              "rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
