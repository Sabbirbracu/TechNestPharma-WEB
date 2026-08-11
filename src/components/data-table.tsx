"use client";

import { type ReactNode } from "react";
import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  /** Header label. */
  header: string;
  /** Cell renderer. */
  cell: (row: T) => ReactNode;
  /** Extra classes for both header and cell (width, alignment, hiding). */
  className?: string;
};

/**
 * Premium data table with sophisticated states and refined interactions.
 * The list surface shared by every module screen. Owns the four states a table
 * can be in — loading, error, empty, populated — so no page reimplements them.
 * Scrolls horizontally on narrow screens rather than letting the page scroll
 * (NFR-03: usable from a phone).
 */
export function DataTable<T>({
  columns,
  rows,
  isLoading,
  error,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  getRowKey,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  isLoading?: boolean;
  error?: unknown;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-destructive/30 bg-gradient-to-br from-destructive/5 to-destructive/10 p-12 text-center shadow-sm"
      >
        <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="size-6" strokeWidth={2} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-destructive">
            Could not load this list
          </p>
          <p className="max-w-md text-xs font-medium text-muted-foreground">
            {error instanceof Error ? error.message : "Unexpected error."}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !rows) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" strokeWidth={2} />
          <span className="text-sm font-medium text-muted-foreground">Loading data…</span>
        </div>
      </div>
    );
  }

  if (rows && rows.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-secondary/40 to-secondary/20 p-12 text-center shadow-sm">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-border/50">
          <Inbox className="size-6" strokeWidth={2} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
          {emptyDescription && (
            <p className="max-w-md text-xs font-medium text-muted-foreground">
              {emptyDescription}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
      {/* Refetching indicator - premium version */}
      {isLoading && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm ring-1 ring-border/50">
          <Loader2 className="size-3.5 animate-spin text-primary" strokeWidth={2} />
          <span className="text-xs font-medium text-muted-foreground">Updating…</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-gradient-to-r from-secondary/60 to-secondary/40">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground/90",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn(isLoading && "opacity-50 transition-opacity duration-300")}>
            {rows?.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-border/40 bg-card last:border-0 transition-all duration-200",
                  onRowClick && "cursor-pointer hover:bg-accent/50 hover:shadow-sm",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={cn("px-5 py-4 align-middle font-medium", column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
