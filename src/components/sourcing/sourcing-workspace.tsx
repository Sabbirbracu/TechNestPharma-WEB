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
import { groupSourcingByProduct, SourcingTable } from "./sourcing-table";
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

  // Table view groups by product, and the API paginates requests, not
  // products — so table view fetches a flat page big enough to hold every
  // matching request (100 = `/sourcing/requests`' own ceiling,
  // settings.max_page_size) and paginates the *groups* client-side instead,
  // the same split the tender detail page's shortlist table already uses.
  const isGrouped = view === "list";

  const params: SourcingRequestParams = {
    q: filters.q || undefined,
    status: stageStatuses.length === 1 ? (stageStatuses[0] as SourcingStatus) : undefined,
    untendered:
      filters.untendered === "" ? undefined : filters.untendered === "true",
    sort: sortField,
    order: sortOrder,
    page: isGrouped ? 1 : page,
    size: isGrouped ? 100 : pageSize,
  };

  const { data, isFetching, error } = useSourcingRequests(params);
  const rows = useMemo(() => data?.items ?? [], [data]);

  const groups = useMemo(() => groupSourcingByProduct(rows), [rows]);
  const groupTotal = groups.length;
  const groupPageCount = Math.max(1, Math.ceil(groupTotal / pageSize));
  const pageGroups = useMemo(
    () => groups.slice((page - 1) * pageSize, page * pageSize),
    [groups, page, pageSize],
  );

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

  // Table view paginates product groups and card view paginates raw requests
  // — page 1 in one view has no correspondence to page 1 in the other, so a
  // stale page number would show blank results after switching.
  function changeView(next: "list" | "grid") {
    setView(next);
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
            Manage supplier enquiries, track communications, and compare quotations.
          </p>
        </div>
        {/* Creating an enquiry from scratch is not built — the flow that will
            feed this is "Start Enquiry" from a product's supplier list. Shown
            disabled so the header matches the design without misleading. */}
        <Button disabled title="Creating an enquiry is not available yet">
          <Plus strokeWidth={2.25} />
          New Sourcing Enquiry
        </Button>
      </div>

      <SourcingPipelineStrip activeStage={stage} onStageSelect={changeStage} />

      <SourcingFilters value={filters} onChange={changeFilters} />

      <div className="w-full min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
        <SourcingTable
          rows={rows}
          groups={pageGroups}
          total={total}
          isFetching={isFetching}
          error={error}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          filtered={filtered}
          onResetFilters={resetAll}
          view={view}
          onViewChange={changeView}
          sort={sort}
          onSortChange={changeSort}
          onExport={exportCsv}
          exporting={exporting}
        />

        {(isGrouped ? groupTotal : total) > 0 && (
          <div className="border-t border-border/60 px-4 py-4 sm:px-5">
            <ResultsPagination
              page={isGrouped ? page : data?.page ?? page}
              pageCount={isGrouped ? groupPageCount : data?.pages ?? 1}
              total={isGrouped ? groupTotal : total}
              pageSize={pageSize}
              itemLabel={isGrouped ? "products" : "results"}
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
            : "Speculative Enquiry",
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
