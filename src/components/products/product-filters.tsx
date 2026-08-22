"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_FILTER_OPTIONS, PACKAGING_TYPE_OPTIONS } from "./product-taxonomy";
import type { MaterialType, PackagingType } from "@/types/domain";

/** The committed filter state the table queries on. */
export type ProductFilterValues = {
  q: string;
  /** "" = both. Packaging is identified by a spec row, not a column (D14). */
  isPackaging: "" | "true" | "false";
  /** Meaningful only when isPackaging is not "true" — the chemical axis. */
  materialType: MaterialType | "";
  /** Meaningful only when isPackaging is "true" — the packaging axis. */
  pkgType: PackagingType | "";
};

export const EMPTY_FILTERS: ProductFilterValues = {
  q: "",
  isPackaging: "",
  materialType: "",
  pkgType: "",
};

/** Packaging already has its own authoritative Product Type toggle, backed by
 *  the packaging_spec row rather than an offer's self-reported material type
 *  (D14) — listing it again here would be the same question asked twice, and
 *  less reliably the second time. */
const MATERIAL_TYPE_OPTIONS = CATEGORY_FILTER_OPTIONS.filter(
  (option) => option.value !== "packaging_material",
);

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
  const isPackagingDraft = draft.isPackaging === "true";

  const dirty =
    draft.q !== value.q ||
    draft.isPackaging !== value.isPackaging ||
    draft.materialType !== value.materialType ||
    draft.pkgType !== value.pkgType;

  const active =
    value.q !== "" ||
    value.isPackaging !== "" ||
    value.materialType !== "" ||
    value.pkgType !== "";

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

        <Field label="Product Type" htmlFor="product-type">
          <Select
            id="product-type"
            value={draft.isPackaging}
            onChange={(event) =>
              setDraft({
                ...draft,
                isPackaging: event.target.value as ProductFilterValues["isPackaging"],
                // The axis below flips meaning with this choice — a stale pick
                // from the other one must not ride along silently.
                materialType: "",
                pkgType: "",
              })
            }
          >
            <option value="">All Types</option>
            <option value="false">Chemicals</option>
            <option value="true">Packaging Materials</option>
          </Select>
        </Field>

        {isPackagingDraft ? (
          <Field label="Packaging Type" htmlFor="product-packaging-type">
            <Select
              id="product-packaging-type"
              value={draft.pkgType}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  pkgType: event.target.value as PackagingType | "",
                })
              }
            >
              <option value="">All Packaging</option>
              {PACKAGING_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label="Material Type" htmlFor="product-material-type">
            <Select
              id="product-material-type"
              value={draft.materialType}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  materialType: event.target.value as MaterialType | "",
                })
              }
            >
              <option value="">All Types</option>
              {MATERIAL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        )}

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
