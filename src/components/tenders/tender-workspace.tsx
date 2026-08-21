"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PAGE_SIZES,
  ResultsPagination,
} from "@/components/search/results-pagination";
import { useTenders } from "@/lib/queries";
import { NewTenderForm } from "./tender-create-form";
import {
  EMPTY_TENDER_FILTERS,
  TenderFilters,
  type TenderFilterValues,
} from "./tender-filters";
import { TenderStats } from "./tender-stats";
import { TenderTable } from "./tender-table";
import { TenderTabs, type TenderTab } from "./tender-tabs";
import { authorityTypeLabel } from "./tender-status";
import type {
  TenderDisplayStatus,
  TenderListItem,
  TenderListParams,
} from "@/types/api";

export function TenderWorkspace() {
  const router = useRouter();
  const [filters, setFilters] = useState<TenderFilterValues>(EMPTY_TENDER_FILTERS);
  const [status, setStatus] = useState<TenderDisplayStatus | "">("");
  const [scope, setScope] = useState<"mine" | "participated" | undefined>(undefined);
  const [sort, setSort] = useState("created_at:desc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [sortField, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

  const params: TenderListParams = {
    q: filters.q || undefined,
    display_status: status || undefined,
    authority_type: filters.authorityType || undefined,
    closing_from: filters.closingFrom || undefined,
    closing_to: filters.closingTo || undefined,
    scope,
    sort: sortField,
    order: sortOrder,
    page,
    size: pageSize,
  };

  const { data, isFetching, error } = useTenders(params);
  const rows = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;

  const filtered =
    filters.q !== "" ||
    filters.authorityType !== "" ||
    filters.closingFrom !== "" ||
    filters.closingTo !== "" ||
    status !== "" ||
    scope !== undefined;

  const activeTab: TenderTab =
    scope === "mine"
      ? "mine"
      : scope === "participated"
        ? "participated"
        : status === "awarded"
          ? "awarded"
          : status === "cancelled"
            ? "cancelled"
            : "all";

  function changeTab(tab: TenderTab) {
    setPage(1);
    if (tab === "mine") {
      setScope("mine");
      setStatus("");
    } else if (tab === "participated") {
      setScope("participated");
      setStatus("");
    } else if (tab === "awarded" || tab === "cancelled") {
      setScope(undefined);
      setStatus(tab);
    } else {
      setScope(undefined);
      setStatus("");
    }
  }

  function changeStatus(next: TenderDisplayStatus | "") {
    setStatus(next);
    setScope(undefined);
    setPage(1);
  }

  function changeFilters(next: TenderFilterValues) {
    setFilters(next);
    setPage(1);
  }

  function changeSort(next: string) {
    setSort(next);
    setPage(1);
  }

  function resetAll() {
    setFilters(EMPTY_TENDER_FILTERS);
    setStatus("");
    setScope(undefined);
    setPage(1);
  }

  function exportCsv() {
    setExporting(true);
    try {
      downloadCsv(rowsToCsv(rows));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tenders
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Manage government and private tenders, required products, and supplier sourcing.
          </p>
        </div>
        {!creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus strokeWidth={2.25} />
            New Tender
          </Button>
        )}
      </div>

      {creating && (
        <NewTenderForm
          onCancel={() => setCreating(false)}
          onCreated={(id) => router.push(`/tenders/${id}`)}
        />
      )}

      <TenderStats
        activeStatus={status || null}
        onStatusSelect={(next) => changeStatus(next ?? "")}
        scope={scope === "mine" ? "mine" : undefined}
      />

      <TenderFilters
        value={filters}
        onChange={changeFilters}
        status={status}
        onStatusChange={changeStatus}
      />

      <TenderTabs active={activeTab} onChange={changeTab} />

      <div className="w-full min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
        <TenderTable
          rows={rows}
          total={total}
          isFetching={isFetching}
          error={error}
          filtered={filtered}
          onResetFilters={resetAll}
          view={view}
          onViewChange={setView}
          sort={sort}
          onSortChange={changeSort}
          onExport={exportCsv}
          exporting={exporting}
        />

        {total > 0 && (
          <div className="border-t border-border/60 px-4 py-4 sm:px-5">
            <ResultsPagination
              page={data?.page ?? page}
              pageCount={data?.pages ?? 1}
              total={total}
              pageSize={pageSize}
              itemLabel="tenders"
              onPageChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Export ---------------------------------------------------------------- */

const COLUMNS = [
  "Tender",
  "Reference",
  "Authority",
  "Authority Type",
  "Closing Date",
  "Status",
  "Products Sourced",
  "Product Count",
] as const;

function rowsToCsv(rows: TenderListItem[]): string {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvField(row.name),
        csvField(row.reference_no),
        csvField(row.buyer_name),
        csvField(authorityTypeLabel(row.authority_type)),
        csvField(row.closing_date),
        csvField(row.display_status),
        csvField(row.sourced_count),
        csvField(row.product_count),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/** RFC 4180, plus a quote in front of anything a spreadsheet would read as a
 *  formula — tender names in this catalogue genuinely start with `-`. */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The BOM is deliberate: without it Excel on Windows reads the file as the
 *  system codepage and mangles every Chinese supplier name. */
function downloadCsv(csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tenders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
