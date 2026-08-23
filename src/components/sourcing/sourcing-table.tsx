"use client";

import { useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FlaskConical,
  Inbox,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteSourcingRequest } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  STATUS_STYLES,
  dueIn,
  formatDate,
  referenceOf,
} from "./sourcing-taxonomy";
import type { SourcingRequestListItem, SourcingStatus } from "@/types/api";

/**
 * One product and every supplier enquiry open against it.
 *
 * A tender shortlists several suppliers for the same product, and a flat list
 * of requests scatters exactly the rows a buyer needs side by side to compare.
 * Grouping mirrors the tender shortlist's own product-first layout (FR-SRC).
 */
export type SourcingProductGroup = {
  productId: number;
  productName: string;
  casNumber: string | null;
  requests: SourcingRequestListItem[];
};

/** Groups in first-seen order, so the group order tracks whatever sort the
 *  caller applied to the underlying flat list. */
export function groupSourcingByProduct(
  rows: SourcingRequestListItem[],
): SourcingProductGroup[] {
  const groups = new Map<number, SourcingProductGroup>();
  for (const row of rows) {
    const existing = groups.get(row.product.id);
    if (existing) {
      existing.requests.push(row);
      continue;
    }
    groups.set(row.product.id, {
      productId: row.product.id,
      productName: row.product.name_en,
      casNumber: row.product.cas_number,
      requests: [row],
    });
  }
  return [...groups.values()];
}

/** Sorted by count so the busiest status leads the summary string. */
function statusBreakdown(
  requests: SourcingRequestListItem[],
): { status: SourcingStatus; count: number }[] {
  const counts = new Map<SourcingStatus, number>();
  for (const request of requests) {
    counts.set(request.status, (counts.get(request.status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

/** The soonest follow-up date across every supplier on this product — the one
 *  that should actually pull a buyer's eye when scanning the group header. */
function earliestFollowUp(requests: SourcingRequestListItem[]): string | null {
  const dates = requests
    .map((request) => request.follow_up_on)
    .filter((date): date is string => Boolean(date));
  return dates.length > 0 ? dates.reduce((min, date) => (date < min ? date : min)) : null;
}

/**
 * The request list.
 *
 * Each row answers the three questions a buyer scans for: what am I sourcing
 * and from whom, where does it stand, and when do I need to chase it. Clicking
 * a row opens the detail panel beside the table rather than navigating — the
 * reader is working through a queue and losing their place costs more than the
 * extra width.
 *
 * Table view groups by product (one accordion row per product, suppliers
 * underneath) since comparing a product's suppliers is the actual task; card
 * view stays a flat grid — comparison isn't the point of glancing at cards.
 */
export function SourcingTable({
  rows,
  groups,
  total,
  isFetching,
  error,
  selectedId,
  onSelect,
  filtered,
  onResetFilters,
  view,
  onViewChange,
  sort,
  onSortChange,
  onExport,
  exporting,
}: {
  rows: SourcingRequestListItem[];
  /** Pre-paginated product groups for table view — the caller (workspace)
   *  fetches a larger flat page, groups it, and paginates the groups, since
   *  the API paginates requests, not products (mirrors the tender detail
   *  shortlist's own group-then-paginate split). */
  groups: SourcingProductGroup[];
  total: number;
  isFetching: boolean;
  error: unknown;
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
  filtered: boolean;
  onResetFilters: () => void;
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  // Bulk selection lives here rather than in the workspace: it is entirely a
  // table concern (doesn't touch filters, sort, or which row the detail panel
  // is showing), the same split used for the Tenders and Companies tables.
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const deleteRequest = useDeleteSourcingRequest();

  function toggleBulk(id: number) {
    setBulkSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Table view's "page" is a page of product groups, not of raw requests —
  // `rows` here is the caller's larger unpaginated fetch behind the grouping,
  // so bulk-select math has to walk the (already paginated) groups instead.
  const pageIds =
    view === "list" ? groups.flatMap((group) => group.requests.map((request) => request.id)) : rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => bulkSelected.has(id));
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;

  function toggleAllOnPage() {
    setBulkSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  /** One DELETE per id (there is no bulk endpoint) — `allSettled` so one bad
   *  id in a batch doesn't stop the rest from going through. */
  async function bulkDelete() {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    const label = `${ids.length} ${ids.length === 1 ? "enquiry" : "enquiries"}`;

    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map((id) => deleteRequest.mutateAsync(id)),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    const succeeded = results.length - failed;

    if (failed === 0) {
      toast.success(`Deleted ${label}`, { duration: 6000 });
    } else if (succeeded === 0) {
      toast.error(`Could not delete ${label}`, { duration: 6000 });
    } else {
      toast.error(
        `Deleted ${succeeded} of ${results.length} enquiries — ${failed} failed`,
        { duration: 6000 },
      );
    }
    setBulkSelected(new Set());
    setDeleting(false);
    setConfirmingBulk(false);
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm font-bold text-foreground">
          All Sourcing Enquiries{" "}
          <span className="tabular-nums">({total.toLocaleString()})</span>
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exporting || total === 0}
            className="h-9"
          >
            {exporting ? (
              <Loader2 className="animate-spin" strokeWidth={2.25} />
            ) : (
              <Download strokeWidth={2.25} />
            )}
            Export
          </Button>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <ViewToggle
              active={view === "list"}
              onClick={() => onViewChange("list")}
              label="Table view"
              icon={<List className="size-4" strokeWidth={2.25} />}
            />
            <ViewToggle
              active={view === "grid"}
              onClick={() => onViewChange("grid")}
              label="Card view"
              icon={<LayoutGrid className="size-4" strokeWidth={2.25} />}
            />
          </div>

          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
              Sort by:
            </span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value)}
              aria-label="Sort enquiries"
              className="h-9 cursor-pointer rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <option value="updated_at:desc">Updated (Newest)</option>
              <option value="created_at:desc">Created (Newest)</option>
              <option value="created_at:asc">Created (Oldest)</option>
              <option value="follow_up_on:asc">Follow-up (Soonest)</option>
              <option value="status:asc">Status</option>
            </select>
          </label>
        </div>
      </div>

      {bulkSelected.size > 0 && (
        <BulkBar
          count={bulkSelected.size}
          onClear={() => setBulkSelected(new Set())}
          onDelete={() => setConfirmingBulk(true)}
          deleting={deleting}
        />
      )}

      {error ? (
        <TableError error={error} />
      ) : isFetching && rows.length === 0 ? (
        <TableLoading />
      ) : rows.length === 0 ? (
        <TableEmpty filtered={filtered} onReset={onResetFilters} />
      ) : (
        <div
          className={cn(
            "transition-opacity duration-200",
            isFetching && "pointer-events-none opacity-60",
          )}
        >
          {view === "list" ? (
            <GroupedListView
              groups={groups}
              selectedId={selectedId}
              onSelect={onSelect}
              bulkSelected={bulkSelected}
              onToggleBulk={toggleBulk}
              allOnPageSelected={allOnPageSelected}
              someOnPageSelected={selectedOnPage.length > 0 && !allOnPageSelected}
              onToggleAll={toggleAllOnPage}
            />
          ) : (
            <CardView rows={rows} selectedId={selectedId} onSelect={onSelect} />
          )}
        </div>
      )}

      {confirmingBulk && (
        <ConfirmDialog
          title="Delete these sourcing enquiries?"
          description={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {bulkSelected.size} request{bulkSelected.size === 1 ? "" : "s"}
              </span>
              ? This cannot be undone from here.
            </>
          }
          confirmLabel="Delete"
          busy={deleting}
          onConfirm={bulkDelete}
          onCancel={() => setConfirmingBulk(false)}
        />
      )}
    </>
  );
}

function GroupedListView({
  groups,
  selectedId,
  onSelect,
  bulkSelected,
  onToggleBulk,
  allOnPageSelected,
  someOnPageSelected,
  onToggleAll,
}: {
  groups: SourcingProductGroup[];
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
  bulkSelected: Set<number>;
  onToggleBulk: (id: number) => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-11" />
          <col className="w-[32%]" />
          <col className="w-[19%]" />
          <col className="w-[26%]" />
          <col className="w-[160px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border/60 bg-secondary/40">
            <th scope="col" className="px-4 py-3.5">
              <Checkbox
                checked={allOnPageSelected}
                indeterminate={someOnPageSelected}
                onChange={onToggleAll}
                aria-label={
                  allOnPageSelected
                    ? "Clear selection on this page"
                    : "Select every enquiry on this page"
                }
              />
            </th>
            <HeaderCell>Product / CAS No.</HeaderCell>
            <HeaderCell>Related To</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Due / Follow-up</HeaderCell>
            <HeaderCell> </HeaderCell>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <ProductGroupRows
              key={group.productId}
              group={group}
              selectedId={selectedId}
              onSelect={onSelect}
              bulkSelected={bulkSelected}
              onToggleBulk={onToggleBulk}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One accordion section per product: a summary row a buyer scans to decide
 *  whether this product needs attention, then its suppliers underneath once
 *  expanded — the comparison a flat list used to scatter across the page. */
function ProductGroupRows({
  group,
  selectedId,
  onSelect,
  bulkSelected,
  onToggleBulk,
}: {
  group: SourcingProductGroup;
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
  bulkSelected: Set<number>;
  onToggleBulk: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = statusBreakdown(group.requests);
  const due = dueIn(earliestFollowUp(group.requests));

  const groupIds = group.requests.map((request) => request.id);
  const checkedInGroup = groupIds.filter((id) => bulkSelected.has(id));
  const allGroupChecked = checkedInGroup.length === groupIds.length;
  const someGroupChecked = checkedInGroup.length > 0 && !allGroupChecked;

  function toggleGroup() {
    const shouldSelect = !allGroupChecked;
    for (const id of groupIds) {
      if (bulkSelected.has(id) !== shouldSelect) onToggleBulk(id);
    }
  }

  return (
    <>
      <tr
        onClick={() => setExpanded((current) => !current)}
        className="cursor-pointer border-b border-border/40 bg-card transition-colors hover:bg-accent/30"
      >
        <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={allGroupChecked}
            indeterminate={someGroupChecked}
            onChange={toggleGroup}
            aria-label={`Select every supplier for ${group.productName}`}
          />
        </td>

        <td className="overflow-hidden px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {expanded ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} />
            )}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tile-green-bg text-tile-green ring-1 ring-inset ring-tile-green/15">
              <FlaskConical className="size-[18px]" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold text-foreground"
                title={group.productName}
              >
                {group.productName}
              </p>
              <p className="truncate text-xs font-medium text-muted-foreground">
                CAS {group.casNumber || "N/A"}
              </p>
            </div>
          </div>
        </td>

        <td className="overflow-hidden px-4 py-3.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground">
            {group.requests.length} {group.requests.length === 1 ? "supplier" : "suppliers"}
          </span>
        </td>

        <td className="overflow-hidden px-4 py-3.5">
          <p className="truncate text-xs font-semibold text-foreground">
            {breakdown
              .map(({ status, count }) => `${count} ${STATUS_STYLES[status].label}`)
              .join(" · ")}
          </p>
        </td>

        <td className="overflow-hidden px-4 py-3.5">
          {due ? (
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold",
                due.overdue ? "text-destructive" : "text-tile-amber",
              )}
            >
              <Calendar className="size-3.5 shrink-0" strokeWidth={2} />
              {due.text}
            </p>
          ) : (
            <span className="text-xs font-medium text-muted-foreground/60">—</span>
          )}
        </td>

        <td className="px-2 py-3.5" />
      </tr>

      {expanded &&
        group.requests.map((request) => (
          <SupplierRow
            key={request.id}
            request={request}
            selected={request.id === selectedId}
            onSelect={() => onSelect(request)}
            bulkChecked={bulkSelected.has(request.id)}
            onToggleBulk={() => onToggleBulk(request.id)}
          />
        ))}
    </>
  );
}

/** One supplier enquiry, indented under its product's header row. */
function SupplierRow({
  request,
  selected,
  onSelect,
  bulkChecked,
  onToggleBulk,
}: {
  request: SourcingRequestListItem;
  selected: boolean;
  onSelect: () => void;
  bulkChecked: boolean;
  onToggleBulk: () => void;
}) {
  const status = STATUS_STYLES[request.status];
  const due = dueIn(request.follow_up_on);
  const deleteRequest = useDeleteSourcingRequest();
  const [confirming, setConfirming] = useState(false);

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b border-dashed border-border/40 transition-colors",
        selected ? "bg-primary/[0.05]" : "hover:bg-accent/40",
      )}
    >
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={bulkChecked}
          onChange={onToggleBulk}
          aria-label={`Select ${request.company.name_en}`}
        />
      </td>

      <td className="overflow-hidden py-3 pl-11 pr-4">
        <div className="flex items-center gap-1.5">
          <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-bold text-foreground" title={request.company.name_en}>
            {request.company.name_en}
          </span>
        </div>
      </td>

      <td className="overflow-hidden px-4 py-3">
        {request.tender ? (
          <>
            <p className="truncate text-xs font-bold text-foreground">
              {request.tender.reference_no ?? `Tender #${request.tender.id}`}
            </p>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {request.tender.name}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-foreground">No Tender</p>
            <p className="text-xs font-medium text-muted-foreground">Speculative Enquiry</p>
          </>
        )}
      </td>

      <td className="overflow-hidden px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
            status.badge,
          )}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", status.dot)} />
          {status.label}
        </span>
      </td>

      <td className="overflow-hidden px-4 py-3">
        {due ? (
          <>
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Calendar className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
              {formatDate(request.follow_up_on)}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs font-semibold",
                due.overdue ? "text-destructive" : "text-tile-amber",
              )}
            >
              {due.text}
            </p>
          </>
        ) : (
          <span className="text-xs font-medium text-muted-foreground/60">—</span>
        )}
      </td>

      <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-end">
          <RowMenu
            row={request}
            onOpen={onSelect}
            onDelete={() => setConfirming(true)}
            deleting={deleteRequest.isPending}
          />
        </div>
      </td>

      {confirming && (
        <ConfirmDialog
          title="Delete this sourcing request?"
          description={
            <>
              Are you sure you want to delete the enquiry for{" "}
              <span className="font-semibold text-foreground">{request.product.name_en}</span>{" "}
              — {request.company.name_en}? This cannot be undone from here.
            </>
          }
          confirmLabel="Delete"
          busy={deleteRequest.isPending}
          onConfirm={() => {
            deleteRequest.mutate(request.id, { onSettled: () => setConfirming(false) });
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </tr>
  );
}

function CardView({
  rows,
  selectedId,
  onSelect,
}: {
  rows: SourcingRequestListItem[];
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
}) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      {rows.map((row) => {
        const status = STATUS_STYLES[row.status];
        const due = dueIn(row.follow_up_on);
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row)}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              row.id === selectedId
                ? "border-primary/40 bg-primary/[0.04] shadow-sm"
                : "border-border/60 bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tile-green-bg text-tile-green ring-1 ring-inset ring-tile-green/15">
                <FlaskConical className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {row.product.name_en}
                </p>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {row.company.name_en}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                  status.badge,
                )}
              >
                <span className={cn("size-1.5 rounded-full", status.dot)} />
                {status.label}
              </span>
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {referenceOf(row)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5 text-xs">
              <span className="truncate font-medium text-muted-foreground">
                {row.tender
                  ? row.tender.reference_no ?? row.tender.name
                  : "Speculative Enquiry"}
              </span>
              {due && (
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    due.overdue ? "text-destructive" : "text-tile-amber",
                  )}
                >
                  {due.text}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RowMenu({
  row,
  onOpen,
  onDelete,
  deleting,
}: {
  row: SourcingRequestListItem;
  onOpen: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <DropdownMenu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`Actions for ${row.product.name_en}`}
          disabled={deleting}
          className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreVertical className="size-4" strokeWidth={2.25} />
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownMenuItem
            onClick={() => {
              close();
              onOpen();
            }}
          >
            <Eye />
            Open enquiry
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard?.writeText(referenceOf(row));
              close();
            }}
          >
            <Copy />
            Copy reference
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Sending is the Gmail slice, which is not built yet. Shown disabled
              rather than hidden: the action belongs here, and hiding it would
              make the row look like it has nothing to do. */}
          <DropdownMenuItem disabled title="Email sending is not connected yet">
            <Send />
            Send enquiry
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <Trash2 />
            Delete enquiry
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

function BulkBar({
  count,
  onClear,
  onDelete,
  deleting,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/[0.06] px-5 py-3">
      <p className="text-sm font-semibold text-foreground">
        <span className="tabular-nums">{count}</span>{" "}
        {count === 1 ? "enquiry" : "enquiries"} selected
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          className="h-8"
        >
          {deleting ? (
            <Loader2 className="animate-spin" strokeWidth={2.25} />
          ) : (
            <Trash2 strokeWidth={2.25} />
          )}
          Delete selected
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={deleting}
          className="h-8"
        >
          <X strokeWidth={2.25} />
          Clear
        </Button>
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="px-4 py-3 text-left text-xs font-bold text-foreground"
    >
      {children}
    </th>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function TableError({ error }: { error: unknown }) {
  return (
    <div
      role="alert"
      className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-12 text-center"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
        <AlertCircle className="size-6" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-destructive">
          Could not load sourcing enquiries
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {error instanceof Error ? error.message : "Unexpected error."}
        </p>
      </div>
    </div>
  );
}

function TableLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[280px] flex-col items-center justify-center gap-3"
    >
      <Loader2 className="size-6 animate-spin text-primary" strokeWidth={2} />
      <span className="text-sm font-medium text-muted-foreground">
        Loading enquiries…
      </span>
    </div>
  );
}

function TableEmpty({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-border/50">
        <Inbox className="size-6" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {filtered ? "No enquiries match these filters" : "No sourcing enquiries yet"}
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {filtered
            ? "Try a different stage, or clear the filters to see everything."
            : "Start one from a product's supplier list, or with New Sourcing Enquiry."}
        </p>
      </div>
      {filtered && (
        <Button variant="outline" size="sm" onClick={onReset}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
