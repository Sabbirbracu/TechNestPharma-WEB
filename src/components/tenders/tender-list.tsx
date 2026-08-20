"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Package, Plus, Search, X } from "lucide-react";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TENDER_STATUS_OPTIONS,
  TenderStatusBadge,
  closingLabel,
} from "@/components/tenders/tender-status";
import { useCreateTender, useTenders } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import type { TenderListItem, TenderStatus } from "@/types/api";

const PAGE_SIZE = 25;

/**
 * The tender worklist (FR-TENDER-01). Each row is one bid; the counts say how
 * much of it has been sourced, which is the question the client opens this
 * screen to answer.
 */
export function TenderList() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TenderStatus | "">("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const debouncedQuery = useDebounced(query);

  const { data, isFetching, error } = useTenders({
    q: debouncedQuery || undefined,
    status: status || undefined,
    page,
    size: PAGE_SIZE,
    sort: "created_at",
    order: "desc",
  });

  const columns: Column<TenderListItem>[] = [
    {
      header: "Tender",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[row.reference_no, row.buyer_name].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => <TenderStatusBadge status={row.status} />,
    },
    {
      header: "Closing",
      cell: (row) => {
        const closing = closingLabel(row.closing_date);
        if (!closing) {
          return <span className="text-xs italic text-muted-foreground/60">No date</span>;
        }
        return (
          <span className="whitespace-nowrap">
            <span className="block text-xs font-medium tabular-nums text-foreground/85">
              {row.closing_date}
            </span>
            <span
              className={cn(
                "block text-[11px] font-semibold",
                closing.urgent ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {closing.text}
            </span>
          </span>
        );
      },
      className: "hidden md:table-cell",
    },
    {
      header: "Shortlisted",
      cell: (row) => (
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          <span className="font-bold tabular-nums text-foreground">
            {row.item_count}
          </span>{" "}
          {row.item_count === 1 ? "entry" : "entries"}
          {row.product_count > 0 && (
            <span className="block text-[11px]">
              {row.product_count} {row.product_count === 1 ? "product" : "products"}
            </span>
          )}
        </span>
      ),
    },
    {
      header: "",
      cell: (row) => (
        <Link
          href={`/tenders/${row.id}`}
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
        >
          Open
        </Link>
      ),
      className: "text-right",
    },
  ];

  return (
    <div className="space-y-4">
      {creating && (
        <NewTenderForm
          onCancel={() => setCreating(false)}
          onCreated={(id) => router.push(`/tenders/${id}`)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search tenders…"
            className="pl-9"
            aria-label="Search tenders"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {TENDER_STATUS_OPTIONS.map((option) => {
            const active = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatus(active ? "" : option.value);
                  setPage(1);
                }}
                aria-pressed={active}
                className={cn(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent/60",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)} className="ml-auto">
            <Plus />
            New tender
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        isLoading={isFetching}
        error={error}
        getRowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/tenders/${row.id}`)}
        emptyTitle="No tenders yet"
        emptyDescription="Create a tender, then shortlist products onto it straight from search."
      />

      {data && (
        <Pagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          size={data.size}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

/** Inline create. Only a name is required — the reference number and buyer
 *  usually get filled in from the notice afterwards, and demanding them up
 *  front would stand between the buyer and the shortlist they came to build. */
function NewTenderForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [buyer, setBuyer] = useState("");
  const [closing, setClosing] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createTender = useCreateTender();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      const tender = await createTender.mutateAsync({
        name: name.trim(),
        reference_no: reference.trim() || null,
        buyer_name: buyer.trim() || null,
        closing_date: closing || null,
      });
      onCreated(tender.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create the tender",
      );
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight">New tender</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Tender name" required>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="DGDA API Tender 2026"
          />
        </Field>
        <Field label="Reference no.">
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="DGDA/API/2026/07"
          />
        </Field>
        <Field label="Buying authority">
          <Input
            value={buyer}
            onChange={(event) => setBuyer(event.target.value)}
            placeholder="Directorate General…"
          />
        </Field>
        <Field label="Closing date">
          <Input
            type="date"
            value={closing}
            onChange={(event) => setClosing(event.target.value)}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!name.trim() || createTender.isPending}>
          {createTender.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
          Create tender
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

/** Small summary tiles reused by the detail page header. */
export function TenderStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package | typeof CalendarClock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3.5 py-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-sm font-bold text-foreground">
          {value}
        </span>
      </span>
    </div>
  );
}
