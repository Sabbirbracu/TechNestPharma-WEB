"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Copy,
  Download,
  Eye,
  FileSearch,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { BuyerBadge } from "@/components/buyer-badge";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DeleteTenderDescription } from "./delete-tender-description";
import { useDeleteTender } from "@/lib/queries";
import { shortReference } from "@/lib/tender-reference";
import { cn } from "@/lib/utils";
import {
  DisplayStatusBadge,
  closingLabel,
} from "./tender-status";
import type { TenderListItem } from "@/types/api";

export function TenderTable({
  rows,
  total,
  isFetching,
  error,
  filtered,
  onResetFilters,
  view,
  onViewChange,
  sort,
  onSortChange,
  onExport,
  exporting,
}: {
  rows: TenderListItem[];
  total: number;
  isFetching: boolean;
  error: unknown;
  filtered: boolean;
  onResetFilters: () => void;
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  sort: string;
  onSortChange: (sort: string) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  // Held here rather than lifted to the workspace: bulk delete is entirely a
  // table concern (it doesn't touch filters, sort or paging), and the ids
  // stay meaningful across a filter/sort change since they're never scoped to
  // "the current page" — clearing only happens once the delete goes through.
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Which selected tenders came from a notice, remembered at selection time:
  // a selection can span pages, and the delete dialog words the outcome by it.
  const [fromNotice, setFromNotice] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const deleteTender = useDeleteTender();

  function rememberOrigin(ids: number[]) {
    setFromNotice((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (ids.includes(row.id) && row.tender_notice_id !== null) next.add(row.id);
      }
      return next;
    });
  }

  function toggleRow(id: number) {
    rememberOrigin([id]);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id));
  const allOnPageSelected =
    pageIds.length > 0 && selectedOnPage.length === pageIds.length;

  const selectedFromNotice = Array.from(selected).filter((id) =>
    fromNotice.has(id),
  ).length;

  function toggleAllOnPage() {
    rememberOrigin(pageIds);
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  /** One DELETE per id (there is no bulk endpoint) — `allSettled` so one bad
   *  id in a batch doesn't stop the rest from going through. */
  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const label = `${ids.length} tender${ids.length === 1 ? "" : "s"}`;

    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map((id) => deleteTender.mutateAsync(id)),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    const succeeded = results.length - failed;

    if (failed === 0) {
      toast.success(`Removed ${label} from the board`, { duration: 6000 });
    } else if (succeeded === 0) {
      toast.error(`Could not delete ${label}`, { duration: 6000 });
    } else {
      toast.error(
        `Removed ${succeeded} of ${results.length} tenders — ${failed} failed`,
        { duration: 6000 },
      );
    }
    setSelected(new Set());
    setDeleting(false);
    setConfirmingBulk(false);
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm font-bold text-foreground">
          All Tenders <span className="tabular-nums">({total.toLocaleString()})</span>
        </p>

        {/* Phone: one row — sort stretches, Export beside it. The view toggle
            is desktop-only: below lg the list is always cards. */}
        <div className="flex items-center gap-2.5 sm:flex-wrap">
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

          <div className="hidden items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm lg:flex">
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

          <label className="order-first flex min-w-0 flex-1 items-center gap-2 sm:order-none sm:flex-none">
            <span className="hidden whitespace-nowrap text-xs font-medium text-muted-foreground sm:inline">
              Sort by:
            </span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value)}
              aria-label="Sort tenders"
              className="h-9 w-full min-w-0 cursor-pointer rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 sm:w-auto"
            >
              <option value="created_at:desc">Created (Newest)</option>
              <option value="created_at:asc">Created (Oldest)</option>
              <option value="closing_date:asc">Closing Date (Soonest)</option>
              <option value="closing_date:desc">Closing Date (Latest)</option>
              <option value="name:asc">Name (A–Z)</option>
            </select>
          </label>
        </div>
      </div>

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onClear={() => setSelected(new Set())}
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
          <MobileList
            rows={rows}
            selected={selected}
            onToggleRow={toggleRow}
            allOnPageSelected={allOnPageSelected}
            someOnPageSelected={selectedOnPage.length > 0 && !allOnPageSelected}
            onToggleAll={toggleAllOnPage}
          />
          <div className="hidden lg:block">
            {view === "list" ? (
              <ListView
                rows={rows}
                selected={selected}
                onToggleRow={toggleRow}
                allOnPageSelected={allOnPageSelected}
                someOnPageSelected={selectedOnPage.length > 0 && !allOnPageSelected}
                onToggleAll={toggleAllOnPage}
              />
            ) : (
              <CardView rows={rows} />
            )}
          </div>
        </div>
      )}

      {confirmingBulk && (
        <ConfirmDialog
          title={selected.size === 1 ? "Delete this tender?" : "Delete these tenders?"}
          description={
            <DeleteTenderDescription
              label={`${selected.size} tender${selected.size === 1 ? "" : "s"}`}
              fromNotice={selectedFromNotice}
              typedIn={selected.size - selectedFromNotice}
            />
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

function ListView({
  rows,
  selected,
  onToggleRow,
  allOnPageSelected,
  someOnPageSelected,
  onToggleAll,
}: {
  rows: TenderListItem[];
  selected: Set<number>;
  onToggleRow: (id: number) => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-11" />
          <col className="w-[46%]" />
          <col className="w-[150px]" />
          <col className="w-[130px]" />
          <col className="w-[180px]" />
          <col className="w-[64px]" />
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
                    : "Select every tender on this page"
                }
              />
            </th>
            <HeaderCell>Tender Reference &amp; Title</HeaderCell>
            <HeaderCell>Closing Date</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Progress</HeaderCell>
            <HeaderCell> </HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              selected={selected.has(row.id)}
              onToggleSelected={() => onToggleRow(row.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  selected,
  onToggleSelected,
}: {
  row: TenderListItem;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const closing = closingLabel(row.closing_date);
  const pct = row.product_count > 0 ? (row.sourced_count / row.product_count) * 100 : 0;

  return (
    <tr
      className={cn(
        "border-b border-border/40 transition-colors last:border-0",
        selected ? "bg-primary/[0.04]" : "hover:bg-accent/40",
      )}
    >
      <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          onChange={onToggleSelected}
          aria-label={`Select ${row.name}`}
        />
      </td>
      <td className="overflow-hidden px-4 py-3.5">
        <Link href={`/tenders/${row.id}`} className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tile-blue-bg text-tile-blue ring-1 ring-inset ring-tile-blue/15">
            <Building2 className="size-[18px]" strokeWidth={2} />
          </span>
          {/* Same shape as the notice screen's tender table: the reference
              (with its authority) leads, the item-derived name follows. The
              authority badge is why there is no separate Authority column. */}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 whitespace-nowrap">
              <BuyerBadge buyerName={row.buyer_name} />
              {row.reference_no ? (
                <span
                  className="truncate font-mono text-sm font-bold text-foreground"
                  title={row.reference_no}
                >
                  {shortReference(row.reference_no)}
                </span>
              ) : (
                <span className="truncate text-sm font-bold text-foreground">
                  No reference
                </span>
              )}
            </p>
            <p
              className="truncate text-xs font-semibold text-foreground/80"
              title={row.name}
            >
              {row.name}
            </p>
          </div>
        </Link>
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        {row.closing_date ? (
          <>
            <p className="text-xs font-medium tabular-nums text-foreground/85">
              {new Date(row.closing_date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
            {closing && (
              <p
                className={cn(
                  "text-[11px] font-semibold",
                  closing.urgent ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {closing.text}
              </p>
            )}
          </>
        ) : (
          <span className="text-xs italic text-muted-foreground/60">No date</span>
        )}
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        <DisplayStatusBadge status={row.display_status} />
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        {row.product_count > 0 ? (
          <>
            <p className="text-xs font-bold tabular-nums text-foreground">
              {row.sourced_count} / {row.product_count}
              <span className="ml-1.5 font-medium text-muted-foreground">
                Products Sourced
              </span>
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full",
                  pct >= 100 ? "bg-success" : "bg-primary",
                )}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </>
        ) : (
          <span className="text-xs font-medium text-muted-foreground/60">
            No products yet
          </span>
        )}
      </td>

      <td className="px-2 py-3.5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/tenders/${row.id}`}
            aria-label={`View ${row.name}`}
            className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground"
          >
            <Eye className="size-4" strokeWidth={2.25} />
          </Link>
          <RowMenu row={row} />
        </div>
      </td>
    </tr>
  );
}

function formatClosing(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * The list below lg: one card per tender, with the table's checkbox (bulk
 * delete works the same) and ⋮ menu kept outside the link.
 */
function MobileList({
  rows,
  selected,
  onToggleRow,
  allOnPageSelected,
  someOnPageSelected,
  onToggleAll,
}: {
  rows: TenderListItem[];
  selected: Set<number>;
  onToggleRow: (id: number) => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <div className="lg:hidden">
      <label className="flex cursor-pointer items-center gap-3 border-b border-border/60 bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
        <Checkbox
          checked={allOnPageSelected}
          indeterminate={someOnPageSelected}
          onChange={onToggleAll}
          aria-label={
            allOnPageSelected
              ? "Clear selection on this page"
              : "Select every tender on this page"
          }
        />
        Select all on this page
      </label>

      <ul className="divide-y divide-border/50">
        {rows.map((row) => {
          const closing = closingLabel(row.closing_date);
          const pct =
            row.product_count > 0 ? (row.sourced_count / row.product_count) * 100 : 0;
          const isSelected = selected.has(row.id);

          return (
            <li
              key={row.id}
              className={cn(
                "flex items-start gap-3 pl-4 transition-colors",
                isSelected && "bg-primary/[0.04]",
              )}
            >
              <span className="flex shrink-0 pt-4">
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggleRow(row.id)}
                  aria-label={`Select ${row.name}`}
                />
              </span>

              <Link href={`/tenders/${row.id}`} className="min-w-0 flex-1 py-3.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <BuyerBadge buyerName={row.buyer_name} />
                    <span
                      className={cn(
                        "truncate text-sm font-bold text-foreground",
                        row.reference_no && "font-mono",
                      )}
                      title={row.reference_no ?? undefined}
                    >
                      {row.reference_no ? shortReference(row.reference_no) : "No reference"}
                    </span>
                  </span>
                  <DisplayStatusBadge status={row.display_status} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-semibold break-words text-foreground/80">
                  {row.name}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-2 text-xs">
                  {row.closing_date ? (
                    <>
                      <span className="font-medium tabular-nums text-foreground/85">
                        Closes {formatClosing(row.closing_date)}
                      </span>
                      {closing && (
                        <span
                          className={cn(
                            "font-semibold",
                            closing.urgent ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          · {closing.text}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="italic text-muted-foreground/60">No closing date</span>
                  )}
                </div>

                {row.product_count > 0 ? (
                  <div className="mt-2">
                    <p className="text-[11px] font-bold tabular-nums text-foreground">
                      {row.sourced_count} / {row.product_count}{" "}
                      <span className="font-medium text-muted-foreground">products sourced</span>
                    </p>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-primary")}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] font-medium text-muted-foreground/70">
                    No products yet
                  </p>
                )}
              </Link>

              <div className="shrink-0 pt-3 pr-2">
                <RowMenu row={row} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CardView({ rows }: { rows: TenderListItem[] }) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
      {rows.map((row) => {
        const closing = closingLabel(row.closing_date);
        const pct = row.product_count > 0 ? (row.sourced_count / row.product_count) * 100 : 0;
        return (
          <Link
            key={row.id}
            href={`/tenders/${row.id}`}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tile-blue-bg text-tile-blue ring-1 ring-inset ring-tile-blue/15">
                <Building2 className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{row.name}</p>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {row.buyer_name ?? "No authority listed"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DisplayStatusBadge status={row.display_status} />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-2.5 text-xs">
              <span className="truncate font-medium text-muted-foreground">
                {row.closing_date
                  ? new Date(row.closing_date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "No closing date"}
              </span>
              {closing && (
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    closing.urgent ? "text-destructive" : "text-tile-amber",
                  )}
                >
                  {closing.text}
                </span>
              )}
            </div>

            {row.product_count > 0 && (
              <div>
                <p className="text-[11px] font-bold tabular-nums text-foreground">
                  {row.sourced_count} / {row.product_count}{" "}
                  <span className="font-medium text-muted-foreground">Products Sourced</span>
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-primary")}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function RowMenu({ row }: { row: TenderListItem }) {
  const deleteTender = useDeleteTender();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <DropdownMenu
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label={`Actions for ${row.name}`}
            className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <MoreVertical className="size-4" strokeWidth={2.25} />
          </button>
        )}
      >
        {(close) => (
          <>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard?.writeText(row.reference_no ?? row.name);
                close();
              }}
            >
              <Copy />
              Copy reference
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={() => {
                close();
                setConfirming(true);
              }}
            >
              <Trash2 />
              Delete tender
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenu>

      {confirming && (
        <ConfirmDialog
          title="Delete this tender?"
          description={
            <DeleteTenderDescription
              label={shortReference(row.reference_no) ?? row.name}
              fromNotice={row.tender_notice_id !== null ? 1 : 0}
              typedIn={row.tender_notice_id !== null ? 0 : 1}
            />
          }
          confirmLabel="Delete"
          busy={deleteTender.isPending}
          onConfirm={() => {
            deleteTender.mutate(row.id, {
              onSuccess: (result) => toast.success(result.detail),
              onSettled: () => setConfirming(false),
            });
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/[0.06] px-4 py-3 sm:px-5">
      <p className="text-sm font-semibold text-foreground">
        <span className="tabular-nums">{count}</span> tender
        {count === 1 ? "" : "s"} selected
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
          Delete<span className="hidden sm:inline"> selected</span>
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
    <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-foreground">
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
        <p className="text-sm font-bold text-destructive">Could not load tenders</p>
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
      <span className="text-sm font-medium text-muted-foreground">Loading tenders…</span>
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
        <FileSearch className="size-6" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {filtered ? "No tenders match these filters" : "No tenders yet"}
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {filtered
            ? "Try a different status, or clear the filters to see everything."
            : "Create your first tender to start building a shortlist against it."}
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
