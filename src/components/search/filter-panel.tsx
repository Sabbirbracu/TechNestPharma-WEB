"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsLeft, ChevronsRight, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FacetKind, FacetValue, Facets, FilterState } from "@/lib/search-facets";

/** How many values a section shows before "+ N more". */
const COLLAPSED_LIMIT = 5;
/** A country list long enough to need its own search box. */
const SEARCHABLE_AT = 8;

/**
 * Faceted filter rail. Ticking a box edits a *draft*; nothing changes on the
 * right until "Apply Filters" — the panel is a form, not a live control, so a
 * user can set up three constraints and see the list move once instead of
 * three times.
 */
export function FilterPanel({
  facets,
  applied,
  draft,
  onDraftChange,
  onApply,
  onReset,
  collapsed,
  onCollapsedChange,
}: {
  facets: Facets;
  applied: FilterState;
  draft: FilterState;
  onDraftChange: (next: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(applied),
    [draft, applied],
  );

  function toggle(kind: FacetKind, value: string) {
    const current = draft[kind];
    onDraftChange({
      ...draft,
      [kind]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    });
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onCollapsedChange(false)}
        aria-label="Expand filters"
        className="hidden h-fit shrink-0 rounded-2xl border border-border/60 bg-card p-3 text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary hover:shadow-md lg:block"
      >
        <ChevronsRight className="size-4" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <aside className="h-fit w-full shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm lg:w-[212px]">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3.5">
        <h2 className="text-base font-bold tracking-tight text-foreground">Filters</h2>
        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          className="hidden items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover lg:inline-flex"
        >
          Collapse
          <ChevronsLeft className="size-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="divide-y divide-border/50">
        <FacetSection
          title="Categories"
          values={facets.category}
          selected={draft.category}
          onToggle={(value) => toggle("category", value)}
        />
        <FacetSection
          title="Country"
          values={facets.country}
          selected={draft.country}
          onToggle={(value) => toggle("country", value)}
          searchPlaceholder="Search country…"
        />
        <FacetSection
          title="Qualification / Standards"
          values={facets.standard}
          selected={draft.standard}
          onToggle={(value) => toggle("standard", value)}
        />
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 bg-secondary/30 px-4 py-3.5">
        <Button
          type="button"
          onClick={onApply}
          disabled={!dirty}
          className="h-9 flex-1 px-3 text-xs"
        >
          Apply Filters
        </Button>
        <Button type="button" variant="secondary" onClick={onReset} className="h-9 px-3 text-xs">
          Reset
        </Button>
      </div>
    </aside>
  );
}

function FacetSection({
  title,
  values,
  selected,
  onToggle,
  searchPlaceholder,
}: {
  title: string;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
  searchPlaceholder?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [term, setTerm] = useState("");

  const filtered = term
    ? values.filter((v) => v.label.toLowerCase().includes(term.toLowerCase()))
    : values;

  // Ticked values always stay visible, even below the fold of a collapsed
  // section — a filter you cannot see is a filter you cannot remove.
  const visible = expanded
    ? filtered
    : filtered.filter((v, i) => i < COLLAPSED_LIMIT || selected.includes(v.value));
  const hiddenCount = filtered.length - visible.length;
  const showSearch = Boolean(searchPlaceholder) && values.length >= SEARCHABLE_AT;

  return (
    <section className="px-4 py-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground/70">
          {values.length}
        </span>
      </div>

      {showSearch && (
        <div className="relative mt-3">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-3 text-xs font-medium transition-all placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          />
        </div>
      )}

      {values.length === 0 ? (
        <p className="mt-3 text-xs font-medium italic text-muted-foreground/60">
          Nothing to filter on in these results.
        </p>
      ) : (
        <ul className="mt-3 space-y-0.5">
          {visible.map((value) => (
            <li key={value.value}>
              <FacetCheckbox
                label={value.label}
                count={value.count}
                checked={selected.includes(value.value)}
                onChange={() => onToggle(value.value)}
              />
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          + {hiddenCount} more
        </button>
      )}
      {expanded && filtered.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-2 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          Show less
        </button>
      )}
    </section>
  );
}

function FacetCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors hover:bg-accent/40",
        // A zero-count value is only listed because it is still ticked; dim it
        // so it reads as "remove me", not "there are results here".
        count === 0 && !checked && "opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[5px] border-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-ring/40 peer-focus-visible:ring-offset-1",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card group-hover:border-primary/50",
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3.5} />}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[13px] transition-colors",
          checked ? "font-semibold text-foreground" : "font-medium text-foreground/80",
        )}
        title={label}
      >
        {label}
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground/70">
        {count.toLocaleString()}
      </span>
    </label>
  );
}
