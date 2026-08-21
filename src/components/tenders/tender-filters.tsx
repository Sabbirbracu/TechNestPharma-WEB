"use client";

import { useState } from "react";
import { ListFilter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AUTHORITY_TYPE_OPTIONS,
  DISPLAY_STATUS_OPTIONS,
} from "./tender-status";
import type { TenderAuthorityType, TenderDisplayStatus } from "@/types/api";

export type TenderFilterValues = {
  q: string;
  authorityType: TenderAuthorityType | "";
  closingFrom: string;
  closingTo: string;
};

export const EMPTY_TENDER_FILTERS: TenderFilterValues = {
  q: "",
  authorityType: "",
  closingFrom: "",
  closingTo: "",
};

/**
 * Edits are held as a draft and committed by Apply — matching Sourcing's
 * filter bar — except the status buckets, which live in the stat strip above
 * and take effect immediately, since that is the point of a clickable card.
 */
export function TenderFilters({
  value,
  onChange,
  status,
  onStatusChange,
}: {
  value: TenderFilterValues;
  onChange: (next: TenderFilterValues) => void;
  status: TenderDisplayStatus | "";
  onStatusChange: (next: TenderDisplayStatus | "") => void;
}) {
  const [draft, setDraft] = useState(value);

  const dirty =
    draft.q !== value.q ||
    draft.authorityType !== value.authorityType ||
    draft.closingFrom !== value.closingFrom ||
    draft.closingTo !== value.closingTo;

  const active =
    value.q !== "" ||
    value.authorityType !== "" ||
    value.closingFrom !== "" ||
    value.closingTo !== "" ||
    status !== "";

  const apply = () => onChange(draft);

  const clear = () => {
    setDraft(EMPTY_TENDER_FILTERS);
    onChange(EMPTY_TENDER_FILTERS);
    onStatusChange("");
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px_170px_220px_auto] lg:items-end">
        <div className="relative">
          <Input
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") apply();
            }}
            placeholder="Search by title, reference, authority…"
            aria-label="Search tenders"
            className="pr-10"
          />
          <Search
            aria-hidden
            className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
        </div>

        <Field label="Status" htmlFor="tender-status">
          <Select
            id="tender-status"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as TenderDisplayStatus | "")
            }
          >
            <option value="">All Status</option>
            {DISPLAY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Authority Type" htmlFor="tender-authority">
          <Select
            id="tender-authority"
            value={draft.authorityType}
            onChange={(event) =>
              setDraft({
                ...draft,
                authorityType: event.target.value as TenderAuthorityType | "",
              })
            }
          >
            <option value="">All Types</option>
            {AUTHORITY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Closing Date">
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={draft.closingFrom}
              onChange={(event) =>
                setDraft({ ...draft, closingFrom: event.target.value })
              }
              aria-label="Closing date from"
              className="h-10 w-full min-w-0 rounded-xl border border-input bg-card px-2.5 text-xs font-medium text-foreground shadow-sm transition-all hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <span className="shrink-0 text-xs text-muted-foreground">–</span>
            <input
              type="date"
              value={draft.closingTo}
              onChange={(event) =>
                setDraft({ ...draft, closingTo: event.target.value })
              }
              aria-label="Closing date to"
              className="h-10 w-full min-w-0 rounded-xl border border-input bg-card px-2.5 text-xs font-medium text-foreground shadow-sm transition-all hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>
        </Field>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="ghost"
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
  htmlFor?: string;
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
