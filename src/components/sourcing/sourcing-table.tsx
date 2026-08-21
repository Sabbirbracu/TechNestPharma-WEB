"use client";

import {
  AlertCircle,
  Calendar,
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  STATUS_STYLES,
  dueIn,
  formatDate,
  referenceOf,
} from "./sourcing-taxonomy";
import type { SourcingRequestListItem } from "@/types/api";

/**
 * The request list.
 *
 * Each row answers the three questions a buyer scans for: what am I sourcing
 * and from whom, where does it stand, and when do I need to chase it. Clicking
 * a row opens the detail panel beside the table rather than navigating — the
 * reader is working through a queue and losing their place costs more than the
 * extra width.
 */
export function SourcingTable({
  rows,
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
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-sm font-bold text-foreground">
          All Sourcing Requests{" "}
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
              aria-label="Sort requests"
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
            <ListView rows={rows} selectedId={selectedId} onSelect={onSelect} />
          ) : (
            <CardView rows={rows} selectedId={selectedId} onSelect={onSelect} />
          )}
        </div>
      )}
    </>
  );
}

function ListView({
  rows,
  selectedId,
  onSelect,
}: {
  rows: SourcingRequestListItem[];
  selectedId: number | null;
  onSelect: (request: SourcingRequestListItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[20%]" />
          <col className="w-[168px]" />
          <col className="w-[172px]" />
          <col className="w-[168px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border/60 bg-secondary/40">
            <HeaderCell>Product / Supplier</HeaderCell>
            <HeaderCell>Related To</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Last Activity</HeaderCell>
            <HeaderCell>Due / Follow-up</HeaderCell>
            <HeaderCell> </HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              selected={row.id === selectedId}
              onSelect={() => onSelect(row)}
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
  onSelect,
}: {
  row: SourcingRequestListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = STATUS_STYLES[row.status];
  const due = dueIn(row.follow_up_on);
  const activity = lastActivityOf(row);

  return (
    <tr
      onClick={onSelect}
      className={cn(
        "cursor-pointer border-b border-border/40 transition-colors last:border-0",
        selected ? "bg-primary/[0.05]" : "hover:bg-accent/40",
      )}
    >
      <td className="overflow-hidden px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tile-green-bg text-tile-green ring-1 ring-inset ring-tile-green/15">
            <FlaskConical className="size-[18px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p
              className="truncate text-sm font-bold text-foreground"
              title={row.product.name_en}
            >
              {row.product.name_en}
            </p>
            <p
              className="truncate text-xs font-medium text-muted-foreground"
              title={row.company.name_en}
            >
              {row.company.name_en}
            </p>
          </div>
        </div>
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        {row.tender ? (
          <>
            <p className="truncate text-xs font-bold text-foreground">
              {row.tender.reference_no ?? `Tender #${row.tender.id}`}
            </p>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {row.tender.name}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold text-foreground">No Tender</p>
            <p className="text-xs font-medium text-muted-foreground">
              Speculative Inquiry
            </p>
          </>
        )}
      </td>

      <td className="overflow-hidden px-4 py-3.5">
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

      <td className="overflow-hidden px-4 py-3.5">
        <p className="truncate text-xs font-medium text-foreground">
          {activity.label}
        </p>
        <p className="truncate text-xs font-medium text-muted-foreground">
          {formatDate(activity.at)}
        </p>
      </td>

      <td className="overflow-hidden px-4 py-3.5">
        {due ? (
          <>
            <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Calendar
                className="size-3.5 shrink-0 text-muted-foreground"
                strokeWidth={2}
              />
              {formatDate(row.follow_up_on)}
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

      <td className="px-2 py-3.5" onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-end">
          <RowMenu row={row} onOpen={onSelect} />
        </div>
      </td>
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
                  : "Speculative Inquiry"}
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
}: {
  row: SourcingRequestListItem;
  onOpen: () => void;
}) {
  return (
    <DropdownMenu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`Actions for ${row.product.name_en}`}
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
              close();
              onOpen();
            }}
          >
            <Eye />
            Open request
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
            Send inquiry
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

/** The most recent thing that happened, which is what "Last Activity" means.
 *  Reads the request's own stamps rather than its children, so the list does
 *  not have to load every communication to print one line. */
function lastActivityOf(row: SourcingRequestListItem): {
  label: string;
  at: string | null;
} {
  if (row.quotation_count > 0 && row.first_replied_at) {
    return { label: "Quotation received", at: row.first_replied_at };
  }
  if (row.first_replied_at) {
    return { label: "Supplier replied", at: row.first_replied_at };
  }
  if (row.sent_at) return { label: "Inquiry sent", at: row.sent_at };
  return { label: "Draft created", at: row.created_at };
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
          Could not load sourcing requests
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
        Loading requests…
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
          {filtered ? "No requests match these filters" : "No sourcing requests yet"}
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {filtered
            ? "Try a different stage, or clear the filters to see everything."
            : "Start one from a product's supplier list, or with New Sourcing Request."}
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
