"use client";

import { useState } from "react";
import {
  CalendarClock,
  FileText,
  MessageSquare,
  Search,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STATUS_OPTIONS, STATUS_STYLES } from "./sourcing-taxonomy";
import type { SourcingAttention, SourcingStatus } from "@/types/api";

/** A supplier or tender that actually has enquiries against it. */
export type FacetOption = { id: number; label: string };

/** The quick filters that cannot be expressed as a single API parameter. */
export type AttentionFilter =
  | "awaiting_reply"
  | "overdue_follow_ups"
  | "unreviewed_quotations";

export type SourcingFilterValues = {
  q: string;
  status: SourcingStatus | "";
  companyId: number | null;
  tenderId: number | null;
  /** "" = both, "true" = speculative only, "false" = tender-backed only. */
  untendered: "" | "true" | "false";
  /** Null = no attention filter. Only one at a time: these are three answers
   *  to "what should I do next", and combining them answers nothing. */
  attention: AttentionFilter | null;
};

export const EMPTY_SOURCING_FILTERS: SourcingFilterValues = {
  q: "",
  status: "",
  companyId: null,
  tenderId: null,
  untendered: "",
  attention: null,
};

export function hasActiveFilters(value: SourcingFilterValues): boolean {
  return (
    value.q !== "" ||
    value.status !== "" ||
    value.companyId !== null ||
    value.tenderId !== null ||
    value.untendered !== "" ||
    value.attention !== null
  );
}

/**
 * Search, three pickers, and a drawer for the rest.
 *
 * The four controls on the front row are the ones a buyer reaches for daily —
 * what, who, which bid, and where it stands. Everything else lives behind
 * "Filters" so the bar stays one row on a laptop.
 *
 * The search box and the dropdowns behave differently on purpose. Picking from
 * a dropdown is already a deliberate, complete act, so it applies on change;
 * typing is not, so the query commits on Enter or on blur rather than firing a
 * request per keystroke. That removes the Apply button the old bar needed —
 * one fewer thing between a buyer and their list.
 */
export function SourcingFilters({
  value,
  onChange,
  suppliers,
  tenders,
  attention,
  sort,
  onSortChange,
}: {
  value: SourcingFilterValues;
  onChange: (next: SourcingFilterValues) => void;
  suppliers: FacetOption[];
  tenders: FacetOption[];
  attention: SourcingAttention | undefined;
  sort: string;
  onSortChange: (next: string) => void;
}) {
  const [query, setQuery] = useState(value.q);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const active = hasActiveFilters(value);
  const queryDirty = query !== value.q;

  function patch(next: Partial<SourcingFilterValues>) {
    onChange({ ...value, ...next });
  }

  function clearAll() {
    setQuery("");
    onChange(EMPTY_SOURCING_FILTERS);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,170px))_auto] lg:items-center">
        <div className="relative">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") patch({ q: query });
            }}
            onBlur={() => {
              if (queryDirty) patch({ q: query });
            }}
            placeholder="Search by product, supplier, CAS, enquiry ID…"
            aria-label="Search sourcing enquiries"
            className="pr-10"
          />
          <Search
            aria-hidden
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
        </div>

        <Select
          value={value.status}
          onChange={(event) =>
            // Status and an attention chip are competing answers to "which
            // rows am I looking at" — one silently overriding the other in the
            // request would leave the losing control still looking selected.
            patch({
              status: event.target.value as SourcingStatus | "",
              attention: null,
            })
          }
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_STYLES[status].label}
            </option>
          ))}
        </Select>

        <Select
          value={value.companyId ?? ""}
          onChange={(event) =>
            patch({
              companyId: event.target.value ? Number(event.target.value) : null,
            })
          }
          aria-label="Filter by supplier"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.label}
            </option>
          ))}
        </Select>

        <Select
          value={value.tenderId ?? ""}
          onChange={(event) =>
            patch({
              tenderId: event.target.value ? Number(event.target.value) : null,
              // A specific tender and "speculative only" cannot both be true;
              // leaving the old choice set would return nothing and look broken.
              untendered: event.target.value ? "" : value.untendered,
            })
          }
          aria-label="Filter by tender"
        >
          <option value="">All Tenders</option>
          {tenders.map((tender) => (
            <option key={tender.id} value={tender.id}>
              {tender.label}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={advancedOpen || value.untendered !== "" ? "default" : "outline"}
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedOpen}
            className="flex-1 lg:flex-none"
          >
            <SlidersHorizontal strokeWidth={2.25} />
            Filters
          </Button>
          {active && (
            <Button
              type="button"
              variant="ghost"
              onClick={clearAll}
              aria-label="Clear all filters"
              className="shrink-0"
            >
              <X strokeWidth={2.25} />
              Clear
            </Button>
          )}
        </div>
      </div>

      {advancedOpen && (
        <div className="mt-4 grid gap-4 border-t border-border/50 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted-foreground">
              Related To
            </span>
            <Select
              value={value.untendered}
              onChange={(event) =>
                patch({
                  untendered: event.target
                    .value as SourcingFilterValues["untendered"],
                  // Same conflict as above, from the other direction.
                  tenderId: event.target.value === "true" ? null : value.tenderId,
                })
              }
            >
              <option value="">All Enquiries</option>
              <option value="false">Tender-backed</option>
              <option value="true">Speculative</option>
            </Select>
          </label>

          {/* Sort lives here rather than in the table toolbar: it is a
              once-a-session choice, and the toolbar's room is better spent on
              grouping, which a buyer changes while reading. */}
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted-foreground">
              Sort By
            </span>
            <Select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="updated_at:desc">Last activity (newest)</option>
              <option value="created_at:desc">Created (newest)</option>
              <option value="created_at:asc">Created (oldest)</option>
              <option value="follow_up_on:asc">Follow-up (soonest)</option>
              <option value="status:asc">Status</option>
            </Select>
          </label>
        </div>
      )}

      {/* --- Needs attention -------------------------------------------------
          The three reasons a request is waiting on the buyer, as filters
          rather than a read-only tally. "6 need attention" is a number; these
          are the three questions behind it, each one click from the rows that
          answer it. */}
      {attention && attention.total > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
          <span className="mr-1 text-xs font-bold text-foreground">
            Needs attention
          </span>
          <AttentionChip
            filter="awaiting_reply"
            count={attention.awaiting_reply}
            label={(n) => `${n} awaiting your reply`}
            icon={MessageSquare}
            tone="bg-tile-green-bg text-tile-green ring-tile-green/20"
            activeTone="bg-tile-green text-primary-foreground ring-tile-green"
            value={value.attention}
            onSelect={(next) => patch({ attention: next, status: "" })}
          />
          <AttentionChip
            filter="overdue_follow_ups"
            count={attention.overdue_follow_ups}
            label={(n) => `${n} follow-up${n === 1 ? "" : "s"} due`}
            icon={CalendarClock}
            tone="bg-destructive/10 text-destructive ring-destructive/20"
            activeTone="bg-destructive text-destructive-foreground ring-destructive"
            value={value.attention}
            onSelect={(next) => patch({ attention: next, status: "" })}
          />
          <AttentionChip
            filter="unreviewed_quotations"
            count={attention.unreviewed_quotations}
            label={(n) => `${n} to review`}
            icon={FileText}
            tone="bg-tile-purple-bg text-tile-purple ring-tile-purple/20"
            activeTone="bg-tile-purple text-primary-foreground ring-tile-purple"
            value={value.attention}
            onSelect={(next) => patch({ attention: next, status: "" })}
          />
        </div>
      )}
    </div>
  );
}

function AttentionChip({
  filter,
  count,
  label,
  icon: Icon,
  tone,
  activeTone,
  value,
  onSelect,
}: {
  filter: AttentionFilter;
  count: number;
  label: (count: number) => string;
  icon: LucideIcon;
  tone: string;
  activeTone: string;
  value: AttentionFilter | null;
  onSelect: (next: AttentionFilter | null) => void;
}) {
  // A reason with nothing behind it is not a filter — hiding it keeps the row
  // to the things that are actually true right now.
  if (count === 0) return null;
  const active = value === filter;

  return (
    <button
      type="button"
      onClick={() => onSelect(active ? null : filter)}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active ? activeTone : tone,
      )}
    >
      {/* Swaps to a dismiss affordance when on, so the chip says how to turn
          itself back off without needing a second control. */}
      {active ? (
        <X className="size-3.5" strokeWidth={2.5} />
      ) : (
        <Icon className="size-3.5" strokeWidth={2.5} />
      )}
      {label(count)}
    </button>
  );
}
