"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PAGE_SIZES,
  ResultsPagination,
} from "@/components/search/results-pagination";
import { useSourcingRequests } from "@/lib/queries";
import { SourcingDetailPanel } from "./sourcing-detail-panel";
import {
  EMPTY_SOURCING_FILTERS,
  SourcingFilters,
  type SourcingFilterValues,
} from "./sourcing-filters";
import { SourcingPipelineStrip } from "./sourcing-pipeline";
import { SourcingTable } from "./sourcing-table";
import {
  PIPELINE_STAGES,
  formatDate,
  referenceOf,
  type StageKey,
} from "./sourcing-taxonomy";
import type {
  SourcingRequestListItem,
  SourcingRequestParams,
  SourcingStatus,
} from "@/types/api";

export function SourcingWorkspace() {
  const [filters, setFilters] = useState<SourcingFilterValues>(
    EMPTY_SOURCING_FILTERS,
  );
  const [stage, setStage] = useState<StageKey | null>(null);
  const [sort, setSort] = useState("updated_at:desc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<SourcingRequestListItem | null>(null);
  const [exporting, setExporting] = useState(false);

  const [sortField, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

  // "Closed" covers four statuses, and the API filters by one. Multi-status
  // filtering would need a repeated query parameter and matching backend
  // support; until then the grouped stage narrows to its first status and the
  // strip stays the honest count.
  const stageStatuses = stage
    ? PIPELINE_STAGES.find((entry) => entry.key === stage)?.statuses ?? []
    : [];

  const params: SourcingRequestParams = {
    q: filters.q || undefined,
    status: stageStatuses.length === 1 ? (stageStatuses[0] as SourcingStatus) : undefined,
    untendered:
      filters.untendered === "" ? undefined : filters.untendered === "true",
    sort: sortField,
    order: sortOrder,
    page,
    size: pageSize,
  };

  const { data, isFetching, error } = useSourcingRequests(params);
  const rows = useMemo(() => data?.items ?? [], [data]);

  const total = data?.total ?? 0;
  const filtered =
    filters.q !== "" || filters.untendered !== "" || stage !== null;

  function changeFilters(next: SourcingFilterValues) {
    setFilters(next);
    setPage(1);
  }

  function changeStage(next: StageKey | null) {
    setStage(next);
    setPage(1);
  }

  function changeSort(next: string) {
    setSort(next);
    setPage(1);
  }

  function resetAll() {
    setFilters(EMPTY_SOURCING_FILTERS);
    setStage(null);
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
            Sourcing
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Manage supplier inquiries, track communications, and compare quotations.
          </p>
        </div>
        {/* Creating a request from scratch is not built — the flow that will
            feed this is "Send Inquiry" from a product's supplier list. Shown
            disabled so the header matches the design without misleading. */}
        <Button disabled title="Creating a request is not available yet">
          <Plus strokeWidth={2.25} />
          New Sourcing Request
        </Button>
      </div>

      <SourcingPipelineStrip activeStage={stage} onStageSelect={changeStage} />

      <SourcingFilters value={filters} onChange={changeFilters} />

      <div className="w-full min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
        <SourcingTable
          rows={rows}
          total={total}
          isFetching={isFetching}
          error={error}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
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

      {selected && (
        <SourcingDetailPanel
          key={selected.id}
          request={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* --- Export ---------------------------------------------------------------- */

const COLUMNS = [
  "Reference",
  "Product",
  "CAS No.",
  "Supplier",
  "Related To",
  "Status",
  "Requested Quantity",
  "Follow-up",
  "Quotations",
  "Communications",
] as const;

function rowsToCsv(rows: SourcingRequestListItem[]): string {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvField(referenceOf(row)),
        csvField(row.product.name_en),
        csvField(row.product.cas_number),
        csvField(row.company.name_en),
        csvField(
          row.tender
            ? row.tender.reference_no ?? row.tender.name
            : "Speculative Inquiry",
        ),
        csvField(row.status),
        csvField(
          row.required_quantity
            ? `${row.required_quantity} ${row.quantity_unit ?? ""}`.trim()
            : "",
        ),
        csvField(row.follow_up_on ? formatDate(row.follow_up_on) : ""),
        csvField(row.quotation_count),
        csvField(row.communication_count),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/** RFC 4180, plus a quote in front of anything a spreadsheet would read as a
 *  formula — product names in this catalogue genuinely start with `-`. */
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
  link.download = `sourcing-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
