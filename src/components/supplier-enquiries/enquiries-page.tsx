"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Inbox,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  ENQUIRY_PAGE_SIZE,
  useDeleteEnquiries,
  useEnquiries,
  useEnquiryCounts,
} from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { flagFor } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type { EnquiryListItem, EnquiryListParams, EnquiryTab } from "@/types/api";
import { ENQUIRY_STATE, ENQUIRY_TABS } from "./enquiry-taxonomy";
import { NewEnquiryDialog } from "./new-enquiry-dialog";

/**
 * Supplier Inquiries (2026-09-17, redesigned 2026-09-21 to the client's
 * mockup).
 *
 * One row is one supplier enquiry — one supplier, one or more products — never
 * one product × supplier line. Four stat cards over the table say where the
 * work stands; the table says how far each supplier has answered (Response)
 * and what happened last. Everything else lives on the enquiry, one click away.
 */

const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "all", label: "All time", days: null },
  { value: "7", label: "Last 7 days", days: 7 },
  { value: "30", label: "Last 30 days", days: 30 },
  { value: "90", label: "Last 90 days", days: 90 },
];

const LAST_EVENT: Record<EnquiryListItem["last_event"], string> = {
  created: "Inquiry created",
  inquiry_sent: "Inquiry sent",
  supplier_replied: "Supplier replied",
  quotation_received: "Quotation received",
};

const CHIP = "inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
const TH = "px-3 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70";

/** "2h ago", "45m ago", "1 day ago", "5 days ago", then a date. */
function ago(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "Direct sourcing", "1 Tender", "2 Tenders", "1 Tender + Direct". */
function sourceText(row: EnquiryListItem): string {
  if (row.tender_count === 0) return "Direct sourcing";
  const tenders = `${row.tender_count} Tender${row.tender_count === 1 ? "" : "s"}`;
  return row.direct_count > 0 ? `${tenders} + Direct` : tenders;
}

export function EnquiriesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<EnquiryTab>("all");
  const [source, setSource] = useState<EnquiryListParams["source"]>("all");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState<EnquiryListParams["sort"]>("activity");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [confirming, setConfirming] = useState<number[] | null>(null);
  const deleteEnquiries = useDeleteEnquiries();
  const q = useDebounced(draft.trim(), 300);

  const counts = useEnquiryCounts("");
  const list = useEnquiries({
    tab,
    q,
    source,
    sinceDays: DATE_RANGES.find((r) => r.value === range)?.days ?? null,
    sort,
    page,
  });
  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = list.data?.pages ?? 1;
  const loading = list.isPending || (list.isPlaceholderData && list.isFetching);
  const filtered = tab !== "all" || source !== "all" || range !== "all" || q !== "";

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  // Every filter change starts again from page one with nothing selected.
  function reset<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
      setSelected(new Set());
    };
  }

  function toggleSelected(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cycleSort() {
    reset(setSort)(sort === "activity" ? "supplier" : sort === "supplier" ? "-supplier" : "activity");
  }

  function clearFilters() {
    setTab("all");
    setSource("all");
    setRange("all");
    setDraft("");
    setPage(1);
    setSelected(new Set());
  }

  function remove(ids: number[]) {
    deleteEnquiries.mutate(ids, {
      onSuccess: (result) => {
        toast.success(
          `Deleted ${result.deleted_enquiries} inquir${result.deleted_enquiries === 1 ? "y" : "ies"}`,
        );
        setSelected(new Set());
        setConfirming(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not delete the inquiries");
        setConfirming(null);
      },
    });
  }

  const first = total === 0 ? 0 : (page - 1) * ENQUIRY_PAGE_SIZE + 1;
  const last = Math.min(page * ENQUIRY_PAGE_SIZE, total);

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px] sm:leading-9">
            Supplier Inquiries
          </h1>
          <p className="text-sm text-muted-foreground sm:text-[15px]">Track supplier quotation requests and responses.</p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          className="h-11 w-full shrink-0 bg-success px-5 text-[15px] text-white shadow-sm hover:bg-success/90 sm:w-auto"
        >
          <Plus strokeWidth={2.5} />
          New Inquiry
        </Button>
      </header>

      <StatCards counts={counts.data} />

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Filter bar */}
        {/* One row only from xl: at lg the sidebar leaves ~690px, and the
            three fixed-width pickers squeezed the search box to nothing. */}
        <div className="flex flex-col gap-3 p-3 sm:p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              enterKeyHint="search"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setPage(1);
                setSelected(new Set());
              }}
              placeholder="Search supplier, product or inquiry ID..."
              aria-label="Search supplier, product or inquiry ID"
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-9 text-sm text-foreground shadow-sm placeholder:text-muted-foreground hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            {draft && (
              <button
                type="button"
                onClick={() => setDraft("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <div className="min-w-0 sm:w-[180px]">
              <Select
                aria-label="Filter by status"
                value={tab}
                onChange={(event) => reset(setTab)(event.target.value as EnquiryTab)}
                className="h-11"
              >
                {ENQUIRY_TABS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.key === "all" ? "All Statuses" : entry.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0 sm:w-[200px]">
              <Select
                aria-label="Filter by source"
                value={source}
                onChange={(event) => reset(setSource)(event.target.value as EnquiryListParams["source"])}
                className="h-11"
              >
                <option value="all">All Sources</option>
                <option value="direct">Direct sourcing</option>
                <option value="tender">From tenders</option>
              </Select>
            </div>
            <div className="col-span-2 flex h-11 items-stretch overflow-hidden rounded-xl border border-input bg-card shadow-sm sm:w-[228px]">
              <div className="relative min-w-0 flex-1">
                <CalendarDays
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-foreground/70"
                />
                <select
                  aria-label="Last activity"
                  value={range}
                  onChange={(event) => reset(setRange)(event.target.value)}
                  className="h-full w-full appearance-none bg-transparent pl-10 pr-3 text-sm font-medium text-foreground focus-visible:outline-none"
                >
                  {DATE_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!filtered}
                title="Reset filters"
                aria-label="Reset filters"
                className="flex w-11 shrink-0 items-center justify-center border-l border-input text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-secondary/40 px-4 py-2 text-sm">
            <span className="font-medium text-foreground">
              {selected.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirming([...selected])}
              disabled={deleteEnquiries.isPending}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {list.error ? (
          <p role="alert" className="flex items-center gap-2 border-t border-border px-5 py-8 text-sm font-semibold text-destructive">
            <AlertCircle className="size-4" />
            {list.error instanceof ApiError ? list.error.message : "The inquiries could not be loaded."}
          </p>
        ) : !loading && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 border-t border-border px-5 py-14 text-center">
            <Inbox className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-[15px] font-semibold text-foreground">
              {filtered ? "No inquiries match these filters" : "No supplier inquiries yet"}
            </p>
            <p className="text-sm text-muted-foreground">
              {filtered ? "Try a different search or reset the filters." : "Start one with New Inquiry."}
            </p>
          </div>
        ) : (
          <>
            {/* Below lg: one card per inquiry, same facts as the table row. */}
            {/* The table's select-all lives in its header; the cards need
                their own. */}
            <label className="flex cursor-pointer items-center gap-3 border-t border-border bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground lg:hidden">
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && rows.some((row) => selected.has(row.id))}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
                }
                aria-label="Select all inquiries on this page"
              />
              Select all on this page
            </label>
            <ul className={cn("divide-y divide-border/70 border-t border-border lg:hidden", loading && "opacity-60")}>
              {rows.map((row) => (
                <li
                  key={row.id}
                  className={cn("flex gap-3 px-4 py-3.5", selected.has(row.id) && "bg-primary/[0.04]")}
                >
                  <Checkbox
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelected(row.id)}
                    aria-label={`Select inquiry ${row.reference ?? ""} with ${row.supplier.name}`}
                    className="mt-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => router.push(`/supplier-enquiries/${row.id}`)}
                    className="min-w-0 flex-1 space-y-2.5 text-left"
                  >
                    <div className="space-y-1.5">
                      <SupplierCell row={row} />
                      <StatusChip row={row} />
                    </div>
                    <div className="rounded-xl bg-secondary/40 px-3 py-2.5">
                      <ProductsCell row={row} />
                      <p className="mt-1 text-xs text-muted-foreground">{sourceText(row)}</p>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <ResponseCell row={row} />
                      <ActivityCell row={row} align="right" />
                    </div>
                  </button>
                  <RowMenu row={row} onDelete={() => setConfirming([row.id])} />
                </li>
              ))}
            </ul>

            {/* Fixed layout with set column widths: the table always fits the
                card, so it never scrolls sideways — long names and product
                lists are cut with "…" instead (full text on hover). */}
            <div className="hidden lg:block">
              <table className={cn("w-full table-fixed text-sm", loading && "opacity-60")}>
                <colgroup>
                  <col className="w-11" />
                  <col className="w-[19%]" />
                  <col className="w-[19%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-16" />
                </colgroup>
                <thead>
                  <tr className="border-y border-border bg-secondary/30 text-left">
                    <th className="py-3.5 pl-4 pr-1">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={!allSelected && rows.some((row) => selected.has(row.id))}
                        onChange={() =>
                          setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
                        }
                        aria-label="Select all inquiries on this page"
                      />
                    </th>
                    <th className={TH}>
                      <button
                        type="button"
                        onClick={cycleSort}
                        className="inline-flex items-center gap-1.5 uppercase hover:text-foreground"
                        aria-label="Sort by supplier"
                      >
                        Supplier
                        <ChevronsUpDown className={cn("size-3.5", sort !== "activity" && "text-primary")} />
                      </button>
                    </th>
                    <th className={TH}>Products</th>
                    <th className={TH}>Source</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Response</th>
                    <th className={TH}>Last activity</th>
                    <th className={cn(TH, "pl-1 pr-4 text-right")}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => router.push(`/supplier-enquiries/${row.id}`)}
                      className="cursor-pointer hover:bg-accent/20"
                    >
                      <td className="py-5 pl-4 pr-1 align-top" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelected(row.id)}
                          aria-label={`Select inquiry ${row.reference ?? ""} with ${row.supplier.name}`}
                        />
                      </td>
                      <td className="px-3 py-5 align-top">
                        <SupplierCell row={row} />
                      </td>
                      <td className="px-3 py-5 align-top">
                        <ProductsCell row={row} />
                      </td>
                      <td className="truncate px-3 py-5 align-middle text-foreground/80" title={sourceText(row)}>
                        {sourceText(row)}
                      </td>
                      <td className="px-3 py-5 align-middle">
                        <StatusChip row={row} wrap />
                      </td>
                      <td className="px-3 py-5 align-top">
                        <ResponseCell row={row} />
                      </td>
                      <td className="px-3 py-5 align-top">
                        <ActivityCell row={row} />
                      </td>
                      <td className="py-5 pl-1 pr-4 align-middle" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end">
                          <RowMenu row={row} onDelete={() => setConfirming([row.id])} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col items-center gap-3 border-t border-border px-4 py-4 sm:flex-row sm:justify-between sm:px-5">
              <p className="text-sm text-muted-foreground">
                {loading && rows.length === 0 ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Loading…
                  </span>
                ) : (
                  `Showing ${first}–${last} of ${total} inquir${total === 1 ? "y" : "ies"}`
                )}
              </p>
              <Pagination page={page} pages={pages} onPage={(next) => { setPage(next); setSelected(new Set()); }} />
            </footer>
          </>
        )}
      </section>

      {confirming && (
        <ConfirmDialog
          title={`Delete ${confirming.length} inquir${confirming.length === 1 ? "y" : "ies"}?`}
          description="Every product line in the selected inquiries is removed from the list. Their emails, quotations and documents stay on file."
          confirmLabel={deleteEnquiries.isPending ? "Deleting…" : "Delete"}
          busy={deleteEnquiries.isPending}
          onConfirm={() => remove(confirming)}
          onCancel={() => setConfirming(null)}
        />
      )}

      {creating && (
        <NewEnquiryDialog
          onClose={() => setCreating(false)}
          onCreated={(inquiryId) => {
            setCreating(false);
            router.push(`/supplier-enquiries/${inquiryId}`);
          }}
        />
      )}
    </div>
  );
}

// --- Stat cards -------------------------------------------------------------------

function StatCards({ counts }: { counts: ReturnType<typeof useEnquiryCounts>["data"] }) {
  const all = counts?.all ?? 0;
  const share = (n: number | undefined) =>
    all ? `${Math.round(((n ?? 0) / all) * 100)}% of total` : "0% of total";
  const cards = [
    {
      value: all,
      label: "Total Inquiries",
      sub: `+${counts?.this_month ?? 0} this month`,
      subClass: "text-success",
      icon: Send,
      tint: "bg-tile-blue-bg text-tile-blue",
    },
    {
      value: counts?.awaiting_response ?? 0,
      label: "Awaiting Response",
      sub: share(counts?.awaiting_response),
      icon: Clock,
      tint: "bg-orange-50 text-orange-500 dark:bg-orange-400/10 dark:text-orange-400",
    },
    {
      value: counts?.partially_quoted ?? 0,
      label: "Partially Quoted",
      sub: share(counts?.partially_quoted),
      icon: FileText,
      tint: "bg-tile-amber-bg text-tile-amber",
    },
    {
      value: counts?.quotation_received ?? 0,
      label: "Quotation Received",
      sub: share(counts?.quotation_received),
      icon: CircleCheck,
      tint: "bg-tile-green-bg text-tile-green",
    },
  ];

  return (
    // Two by two on phones and tablets; all four in one row from lg (client
    // request, 2026-09-21). At lg the sidebar leaves each card ~160px, too
    // narrow for icon-beside-figure, so it stacks there as on a phone and goes
    // side by side again from xl.
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex min-w-0 flex-col items-start gap-2.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-5 lg:flex-col lg:items-start lg:gap-2.5 lg:px-4 lg:py-4 xl:flex-row xl:items-center xl:gap-5 xl:px-6 xl:py-5"
        >
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12 lg:size-10 xl:size-12", card.tint)}>
            <card.icon className="size-5 sm:size-6 lg:size-5 xl:size-6" strokeWidth={2} />
          </span>
          <div className="min-w-0 max-w-full">
            <p className="text-xl font-bold leading-7 tabular-nums text-foreground sm:text-2xl sm:leading-8">{card.value}</p>
            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground/85 sm:text-[15px] lg:text-sm xl:truncate xl:text-[15px]">
              {card.label}
            </p>
            <p className={cn("mt-0.5 truncate text-xs text-muted-foreground sm:text-[13px]", card.subClass)}>{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Cells -------------------------------------------------------------------------

function SupplierCell({ row }: { row: EnquiryListItem }) {
  const flag = flagFor(row.supplier.country_code);
  return (
    <div className="min-w-0">
      {/* Two lines in the phone card, one in the table (lg+). */}
      <p
        title={row.supplier.name}
        className="line-clamp-2 break-words font-semibold leading-snug text-foreground lg:truncate"
      >
        {row.supplier.name}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground lg:flex-nowrap lg:overflow-hidden lg:whitespace-nowrap">
        {row.supplier.country && (
          <>
            <span className="inline-flex items-center gap-1.5">
              {flag && <span aria-hidden className="text-sm leading-none">{flag}</span>}
              {row.supplier.country}
            </span>
            {row.reference && <span aria-hidden className="text-border">|</span>}
          </>
        )}
        {row.reference && <span>{row.reference}</span>}
      </p>
    </div>
  );
}

function ProductsCell({ row }: { row: EnquiryListItem }) {
  const first = row.items[0]?.product_name;
  const more = row.item_count - 1;
  return (
    <div className="min-w-0">
      <p className="font-medium text-foreground">
        {row.item_count} product{row.item_count === 1 ? "" : "s"}
      </p>
      {first && (
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground" title={row.items.map((i) => i.product_name).join(", ")}>
          {first}
          {more > 0 && ` +${more} more`}
        </p>
      )}
    </div>
  );
}

/** `wrap`: in the table, a long label ("Quotation received") may take two
 *  lines on a laptop screen rather than widen the column. */
function StatusChip({ row, wrap = false }: { row: EnquiryListItem; wrap?: boolean }) {
  const state = ENQUIRY_STATE[row.state];
  return (
    <span className={cn(CHIP, wrap && "whitespace-normal leading-tight 2xl:whitespace-nowrap", state.className)}>
      {state.label}
    </span>
  );
}

/** Quoted lines out of all lines: grey at none, blue part-way, green when
 *  every product has a quote. */
function ResponseCell({ row }: { row: EnquiryListItem }) {
  const ratio = row.item_count ? row.quoted_count / row.item_count : 0;
  return (
    <div className="w-full max-w-24">
      <p className="font-semibold tabular-nums text-foreground">
        {row.quoted_count}/{row.item_count}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", ratio >= 1 ? "bg-success" : "bg-tile-blue")}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ActivityCell({ row, align }: { row: EnquiryListItem; align?: "right" }) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className="truncate text-foreground/85">{ago(row.last_activity_at)}</p>
      <p className="mt-0.5 truncate text-[13px] text-muted-foreground" title={LAST_EVENT[row.last_event]}>
        {LAST_EVENT[row.last_event]}
      </p>
    </div>
  );
}

function RowMenu({ row, onDelete }: { row: EnquiryListItem; onDelete: () => void }) {
  const router = useRouter();
  return (
    <DropdownMenu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`Actions for ${row.supplier.name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent"
        >
          <MoreHorizontal className="size-4" />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownMenuItem
            onClick={() => {
              close();
              router.push(`/supplier-enquiries/${row.id}`);
            }}
          >
            <ExternalLink />
            Open inquiry
          </DropdownMenuItem>
          {row.reference && (
            <DropdownMenuItem
              onClick={() => {
                close();
                navigator.clipboard.writeText(row.reference ?? "");
                toast.success("Reference copied");
              }}
            >
              <Copy />
              Copy reference
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <Trash2 />
            Delete inquiry
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

function Pagination({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
}) {
  // Up to five numbers around the current page.
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  const cell = "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors";
  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={cn(cell, "border-border bg-card text-foreground hover:bg-accent disabled:opacity-40")}
      >
        <ChevronLeft className="size-4" />
      </button>
      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPage(n)}
          aria-current={n === page ? "page" : undefined}
          className={cn(
            cell,
            n === page
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-accent",
          )}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        className={cn(cell, "border-border bg-card text-foreground hover:bg-accent disabled:opacity-40")}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
