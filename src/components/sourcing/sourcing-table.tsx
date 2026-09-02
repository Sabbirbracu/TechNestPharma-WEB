"use client";

import { useState } from "react";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FileText,
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
  formatDateTime,
  groupTile,
  nextAction,
  referenceOf,
  relativeTime,
  statusDetail,
} from "./sourcing-taxonomy";
import type { SourcingRequestListItem } from "@/types/api";

/**
 * How the list is bundled.
 *
 * Product is the default because a tender shortlists several suppliers for the
 * same item, and comparing them is the actual task — a flat list scatters
 * exactly the rows a buyer needs side by side. Supplier answers the other
 * standing question ("what is open with A.H.A?"), and None is the escape hatch
 * for when you are looking for one specific enquiry.
 */
export type GroupBy = "product" | "supplier" | "none";

export const GROUP_BY_LABELS: Record<GroupBy, string> = {
  product: "Product",
  supplier: "Supplier",
  none: "Nothing",
};

export type SourcingGroup = {
  key: string;
  /** The product or company this group is, used to pick a stable tile colour
   *  — one that reshuffled on every re-sort would be worse than none. */
  id: number;
  title: string;
  /** CAS number under a product heading, country/short name under a supplier
   *  one — whatever the second line of that heading should read. */
  subtitle: string | null;
  requests: SourcingRequestListItem[];
};

/** Groups in first-seen order, so group order tracks whatever sort the caller
 *  applied to the underlying flat list. */
export function groupSourcing(
  rows: SourcingRequestListItem[],
  by: GroupBy,
): SourcingGroup[] {
  if (by === "none") {
    // One row per group renders as a flat list through the same code path,
    // rather than a second table that would drift from this one.
    return rows.map((row) => ({
      key: `request-${row.id}`,
      id: row.product.id,
      title: row.product.name_en,
      subtitle: row.product.cas_number ? `CAS ${row.product.cas_number}` : null,
      requests: [row],
    }));
  }

  const groups = new Map<string, SourcingGroup>();
  for (const row of rows) {
    const key =
      by === "product" ? `product-${row.product.id}` : `company-${row.company.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.requests.push(row);
      continue;
    }
    groups.set(key, {
      key,
      id: by === "product" ? row.product.id : row.company.id,
      title: by === "product" ? row.product.name_en : row.company.name_en,
      subtitle:
        by === "product"
          ? row.product.cas_number
            ? `CAS ${row.product.cas_number}`
            : "CAS N/A"
          : row.company.name_cn,
      requests: [row],
    });
  }
  return [...groups.values()];
}

/**
 * The enquiry list.
 *
 * The redesign's one structural change is the last column. The old table ended
 * on "Due / Follow-up", a date the reader had to interpret; this one ends on a
 * button that says what to do. Status stopped being a noun ("1 Response
 * Received") and became a state plus a sentence about it — "Replied · New
 * reply" — and Last Activity replaced the follow-up date as the thing a buyer
 * scans, because how long a supplier has been silent is the question they are
 * actually asking.
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
  groupBy,
  onGroupByChange,
}: {
  rows: SourcingRequestListItem[];
  /** Pre-paginated groups — the caller fetches a larger flat page, groups it,
   *  and paginates the groups, since the API paginates requests, not products
   *  (the same split the tender detail shortlist uses). */
  groups: SourcingGroup[];
  total: number;
  isFetching: boolean;
  error: unknown;
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
  filtered: boolean;
  onResetFilters: () => void;
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  groupBy: GroupBy;
  onGroupByChange: (next: GroupBy) => void;
}) {
  // Bulk selection lives here rather than in the workspace: it is entirely a
  // table concern (doesn't touch filters, sort, or which row the detail panel
  // is showing), the same split the Tenders and Companies tables use.
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

  // List view's "page" is a page of groups, not of raw requests — `rows` is
  // the caller's larger unpaginated fetch behind the grouping, so bulk-select
  // math has to walk the (already paginated) groups instead.
  const pageIds =
    view === "list"
      ? groups.flatMap((group) => group.requests.map((request) => request.id))
      : rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => bulkSelected.has(id));
  const allOnPageSelected =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;

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
        <p className="text-lg font-bold tracking-tight text-foreground">
          All Enquiries{" "}
          <span className="tabular-nums">({total.toLocaleString()})</span>
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* The label sits inside the control rather than beside it, so the
              whole thing reads as one phrase — "Group by: Product" — instead
              of a caption that could be mistaken for a column heading. */}
          <label className="flex h-11 items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 shadow-sm transition-colors focus-within:border-ring hover:border-ring/40">
            <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
              Group by:
            </span>
            <span className="relative flex items-center">
              <select
                value={groupBy}
                onChange={(event) => onGroupByChange(event.target.value as GroupBy)}
                aria-label="Group enquiries by"
                className="cursor-pointer appearance-none bg-transparent pr-6 text-sm font-semibold text-foreground focus:outline-none"
              >
                {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map((key) => (
                  <option key={key} value={key}>
                    {GROUP_BY_LABELS[key]}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-0 size-4 text-muted-foreground"
                strokeWidth={2.25}
              />
            </span>
          </label>

          <div className="flex items-center gap-1 rounded-xl border border-input bg-card p-1 shadow-sm">
            <ViewToggle
              active={view === "list"}
              onClick={() => onViewChange("list")}
              label="Table view"
              icon={<List className="size-[18px]" strokeWidth={2.25} />}
            />
            <ViewToggle
              active={view === "grid"}
              onClick={() => onViewChange("grid")}
              label="Card view"
              icon={<LayoutGrid className="size-[18px]" strokeWidth={2.25} />}
            />
          </div>
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
              groupBy={groupBy}
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
                {bulkSelected.size} enquir{bulkSelected.size === 1 ? "y" : "ies"}
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
  groupBy,
  selectedId,
  onSelect,
  bulkSelected,
  onToggleBulk,
  allOnPageSelected,
  someOnPageSelected,
  onToggleAll,
}: {
  groups: SourcingGroup[];
  groupBy: GroupBy;
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
      <table className="w-full min-w-[1080px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-12" />
          <col className="w-[30%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[18%]" />
          <col className="w-[168px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border/60">
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
            <HeaderCell>Supplier</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Last Activity</HeaderCell>
            <HeaderCell>Next Action</HeaderCell>
            <HeaderCell> </HeaderCell>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows
              key={group.key}
              group={group}
              groupBy={groupBy}
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

/**
 * One accordion section per group, open by default.
 *
 * Collapsed-by-default was the old behaviour and it was wrong: a buyer opening
 * this screen wants to see the enquiries, not a list of headings to click. The
 * heading is now a summary you can fold away once you have dealt with it,
 * which is the opposite default and the right one.
 *
 * Selection lives on the heading and nowhere else. A tender shortlists the
 * same product to several suppliers and they are acted on together, so a
 * checkbox per supplier row was six controls offering a choice nobody makes —
 * one per product is the unit of work.
 */
function GroupRows({
  group,
  groupBy,
  selectedId,
  onSelect,
  bulkSelected,
  onToggleBulk,
}: {
  group: SourcingGroup;
  groupBy: GroupBy;
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
  bulkSelected: Set<number>;
  onToggleBulk: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

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

  // With no grouping there is no heading to hang the checkbox on, so each row
  // carries its own — it is its own group of one.
  if (groupBy === "none") {
    return (
      <>
        {group.requests.map((request) => (
          <EnquiryRow
            key={request.id}
            request={request}
            showProduct
            selectable
            selected={request.id === selectedId}
            onSelect={() => onSelect(request)}
            bulkChecked={bulkSelected.has(request.id)}
            onToggleBulk={() => onToggleBulk(request.id)}
          />
        ))}
      </>
    );
  }

  const count = group.requests.length;
  const Icon = groupBy === "product" ? FlaskConical : Building2;

  return (
    <>
      <tr
        onClick={() => setExpanded((current) => !current)}
        className="cursor-pointer border-b border-border/40 bg-card transition-colors hover:bg-accent/25"
      >
        <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={allGroupChecked}
            indeterminate={someGroupChecked}
            onChange={toggleGroup}
            aria-label={`Select every enquiry under ${group.title}`}
          />
        </td>

        {/* Spans the product and supplier columns: the heading names the
            product, and the rows beneath name the suppliers in the same
            visual channel, indented under it. */}
        <td className="overflow-hidden py-4 pl-1 pr-4" colSpan={2}>
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={2.5}
              />
            ) : (
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground"
                strokeWidth={2.5}
              />
            )}
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
                groupTile(group.id),
              )}
            >
              <Icon className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-[15px] font-bold leading-tight text-foreground"
                title={group.title}
              >
                {group.title}
              </p>
              {group.subtitle && (
                <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground">
                  {group.subtitle}
                </p>
              )}
            </div>
            <span className="ml-3 shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {count} {count === 1 ? "enquiry" : "enquiries"}
            </span>
          </div>
        </td>

        {/* Left empty on purpose. The heading's job is to name the product and
            say how many suppliers are under it; repeating a rolled-up status
            here would compete with the rows that carry the real ones. */}
        <td colSpan={4} />
      </tr>

      {expanded &&
        group.requests.map((request) => (
          <EnquiryRow
            key={request.id}
            request={request}
            showProduct={groupBy === "supplier"}
            selectable={false}
            selected={request.id === selectedId}
            onSelect={() => onSelect(request)}
            bulkChecked={bulkSelected.has(request.id)}
            onToggleBulk={() => onToggleBulk(request.id)}
          />
        ))}
    </>
  );
}

/** One supplier enquiry, indented under its group heading. */
function EnquiryRow({
  request,
  showProduct,
  selectable,
  selected,
  onSelect,
  bulkChecked,
  onToggleBulk,
}: {
  request: SourcingRequestListItem;
  /** True when the heading above is not already naming the product. */
  showProduct: boolean;
  /** Only the ungrouped view puts a checkbox on the row itself. */
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
  bulkChecked: boolean;
  onToggleBulk: () => void;
}) {
  const status = STATUS_STYLES[request.status];
  const detail = statusDetail(request);
  const action = nextAction(request);
  const deleteRequest = useDeleteSourcingRequest();
  const [confirming, setConfirming] = useState(false);

  const due = dueIn(request.follow_up_on);
  const reference = request.tender
    ? request.tender.reference_no ?? request.tender.name
    : referenceOf(request);

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b border-border/40 transition-colors",
        selected ? "bg-primary/[0.05]" : "hover:bg-accent/30",
      )}
    >
      <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
        {selectable && (
          <Checkbox
            checked={bulkChecked}
            onChange={onToggleBulk}
            aria-label={`Select ${request.company.name_en}`}
          />
        )}
      </td>

      {/* Indented into the heading's channel and spanning the same two
          columns, so the supplier reads as a child of the product above it. */}
      <td className="overflow-hidden py-3.5 pl-11 pr-4" colSpan={2}>
        <div className="flex items-start gap-2.5">
          <Building2
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p
              className="truncate text-sm font-bold leading-tight text-foreground"
              title={request.company.name_en}
            >
              {request.company.name_en}
            </p>
            <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground">
              {showProduct ? request.product.name_en : reference}
            </p>
          </div>
        </div>
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        <span
          className={cn(
            "inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold",
            status.badge,
          )}
        >
          {status.label}
        </span>
        {/* The sentence under the badge is what makes the status actionable —
            "Replied" is where it sits, "New reply" is what that means today. */}
        <p className="mt-1.5 flex items-center gap-1.5 truncate text-[13px] font-medium text-muted-foreground">
          {detail.dot && (
            <span className={cn("size-1.5 shrink-0 rounded-full", detail.dot)} />
          )}
          {detail.text}
        </p>
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        <p className="truncate text-[13px] font-semibold text-foreground">
          {relativeTime(request.last_activity_at)}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-muted-foreground">
          {formatDateTime(request.last_activity_at)}
        </p>
        {due?.overdue && (
          <p className="mt-0.5 truncate text-[13px] font-semibold text-destructive">
            Follow-up {due.text.toLowerCase()}
          </p>
        )}
      </td>

      <td className="px-4 py-3.5">
        {/* Opens the same enquiry as clicking the row. The button exists for
            its label: naming the next step is what turns a report into a
            queue, and a reader who only scans this column still knows what
            the row wants from them. */}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          className={cn(
            "w-full rounded-lg px-3 py-2 text-center text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            action.tone,
          )}
        >
          {action.label}
        </button>
      </td>

      <td className="px-2 py-3.5" onClick={(event) => event.stopPropagation()}>
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
          title="Delete this sourcing enquiry?"
          description={
            <>
              Are you sure you want to delete the enquiry for{" "}
              <span className="font-semibold text-foreground">
                {request.product.name_en}
              </span>{" "}
              — {request.company.name_en}? This cannot be undone from here.
            </>
          }
          confirmLabel="Delete"
          busy={deleteRequest.isPending}
          onConfirm={() => {
            deleteRequest.mutate(request.id, {
              onSettled: () => setConfirming(false),
            });
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
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 2xl:grid-cols-3">
      {rows.map((row) => {
        const status = STATUS_STYLES[row.status];
        const detail = statusDetail(row);
        const action = nextAction(row);

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
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                {detail.dot && (
                  <span className={cn("size-1.5 rounded-full", detail.dot)} />
                )}
                {detail.text}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
              <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                {relativeTime(row.last_activity_at)}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                  action.tone,
                )}
              >
                {action.label}
              </span>
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
              close();
              onOpen();
            }}
          >
            <Send />
            Open conversation
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
          {/* Reading a quotation out of a supplier's reply is the extraction
              slice, which is not built. Shown disabled rather than hidden:
              the action belongs here, and hiding it would make the row look
              like it has nothing to do. */}
          <DropdownMenuItem disabled title="Quotation capture is not built yet">
            <FileText />
            Record a quotation
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
      className="px-4 py-3.5 text-left text-[13px] font-semibold text-muted-foreground"
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
        "flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-foreground text-background shadow-sm"
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
            : "Start one from a tender's shortlist, or from a product's supplier list."}
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
