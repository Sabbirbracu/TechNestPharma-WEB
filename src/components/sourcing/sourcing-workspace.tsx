"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  PAGE_SIZES,
  ResultsPagination,
} from "@/components/search/results-pagination";
import {
  isMailboxReauthError,
  useMailboxSettings,
  useSourcingPipeline,
  useSourcingRequest,
  useSourcingRequests,
  useSyncMailbox,
} from "@/lib/queries";
import { SourcingDetailPanel } from "./sourcing-detail-panel";
import {
  EMPTY_SOURCING_FILTERS,
  hasActiveFilters,
  SourcingFilters,
  type FacetOption,
  type SourcingFilterValues,
} from "./sourcing-filters";
import { SourcingHeader } from "./sourcing-header";
import { SourcingPipelineStrip } from "./sourcing-pipeline";
import {
  FollowUpsCard,
  QuickActionsCard,
  RecentInboxCard,
} from "./sourcing-rail";
import { groupSourcing, SourcingTable, type GroupBy } from "./sourcing-table";
import {
  PIPELINE_STAGES,
  formatDate,
  isClosed,
  referenceOf,
  relativeTime,
  type StageKey,
} from "./sourcing-taxonomy";
import type {
  SourcingRequestListItem,
  SourcingRequestParams,
  SourcingStatus,
} from "@/types/api";

/**
 * Supplier outreach (FR-SRC).
 *
 * The screen answers one question — *what needs me next?* — at three
 * magnifications: the strip counts the pipeline, the rail names the specific
 * things waiting, and the table gives every row a button saying what to do
 * with it.
 *
 * It stacks rather than splitting into a column: the counters, then the three
 * attention cards, then the list at the full width of the screen. The table is
 * the payload and a permanent side rail would tax every row of it to keep four
 * items visible.
 *
 * The three cards' queries are deliberately not the table's. They must keep
 * answering "is anything waiting on me" while the reader narrows the table to
 * one supplier, so they run unfiltered and are not driven by the filter state.
 */

/** How often the list re-checks the server for replies that landed elsewhere.
 *
 *  Polling rather than sockets: the useful granularity here is "before I next
 *  look", not "instantly", and two minutes of staleness on an email thread is
 *  invisible. Paused while the tab is hidden, so a screen left open overnight
 *  is not still asking.
 *
 *  Note this only refreshes what the *server* already knows. Making the server
 *  itself pull from Gmail on a schedule is the background-worker slice; until
 *  that lands, "Sync now" is what actually reaches out to Google. */
const POLL_MS = 120_000;

/** `/sourcing/requests` caps a page at 100 (settings.max_page_size). Grouped
 *  view fetches one such page and paginates the *groups* client-side, since
 *  the API paginates requests, not products. */
const GROUPING_FETCH_SIZE = 100;

export function SourcingWorkspace() {
  const searchParams = useSearchParams();
  // /sourcing?company=<id> — where "Start Sourcing" on a supplier's profile
  // lands. Read once as the initial filter rather than synced, so clearing the
  // supplier chip is not undone on the next render.
  const [filters, setFilters] = useState<SourcingFilterValues>(() => {
    const companyId = Number(searchParams.get("company")) || null;
    return companyId
      ? { ...EMPTY_SOURCING_FILTERS, companyId }
      : EMPTY_SOURCING_FILTERS;
  });
  const [sort, setSort] = useState("updated_at:desc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [groupBy, setGroupBy] = useState<GroupBy>("product");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<SourcingRequestListItem | null>(null);
  const [exporting, setExporting] = useState(false);

  // Deep link from a notification: /sourcing?open=<id>. The row is fetched
  // rather than looked up in the current page, because the enquiry a
  // notification is about is usually not on whatever page happens to be
  // loaded — and `SourcingRequestDetail` is a superset of the list row, so the
  // panel takes it as-is.
  const deepLinkId = Number(searchParams.get("open")) || null;
  const { data: deepLinked } = useSourcingRequest(deepLinkId);
  // Which deep link has already been dismissed. Derived rather than synced
  // into `selected` by an effect: the query string outlives the panel, so
  // copying it into state would reopen the panel on the very next render.
  const [dismissedDeepLink, setDismissedDeepLink] = useState<number | null>(null);

  const openRequest =
    selected ??
    (deepLinkId !== null && deepLinkId !== dismissedDeepLink
      ? deepLinked ?? null
      : null);

  const closePanel = () => {
    setSelected(null);
    if (deepLinkId !== null) setDismissedDeepLink(deepLinkId);
  };

  const [sortField, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

  const { data: mailbox } = useMailboxSettings();
  const syncMailbox = useSyncMailbox();
  const { data: pipeline, isPending: pipelinePending } = useSourcingPipeline({
    refetchInterval: POLL_MS,
  });

  // Two of the three attention filters map cleanly onto API parameters, so
  // they narrow server-side and pagination stays honest. "Awaiting reply" has
  // no equivalent — it is derived from the thread — and is applied below over
  // the fetched rows, the same client-side pass grouping already does.
  const today = new Date().toISOString().slice(0, 10);
  const attentionStatus: SourcingStatus | undefined =
    filters.attention === "unreviewed_quotations"
      ? "quotation_received"
      : undefined;

  // Grouping and the attention filters both narrow on the client, so either
  // one means fetching the whole set and paginating here. Otherwise the card
  // view lets the API do both.
  const isGrouped = view === "list";
  const clientPaginated = isGrouped || filters.attention !== null;

  const params: SourcingRequestParams = {
    q: filters.q || undefined,
    status: attentionStatus ?? (filters.status || undefined),
    company_id: filters.companyId ?? undefined,
    tender_id: filters.tenderId ?? undefined,
    follow_up_before:
      filters.attention === "overdue_follow_ups" ? today : undefined,
    untendered:
      filters.untendered === "" ? undefined : filters.untendered === "true",
    sort: sortField,
    order: sortOrder,
    page: clientPaginated ? 1 : page,
    size: clientPaginated ? GROUPING_FETCH_SIZE : pageSize,
  };

  const { data, isFetching, error } = useSourcingRequests(params, {
    refetchInterval: POLL_MS,
  });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (filters.attention === "awaiting_reply") {
      return items.filter((row) => row.awaiting_us && !isClosed(row.status));
    }
    if (filters.attention === "overdue_follow_ups") {
      // `follow_up_before` catches the dates but not the pipeline: a cancelled
      // enquiry with a stale follow-up date is not work.
      return items.filter((row) => !isClosed(row.status));
    }
    return items;
  }, [data, filters.attention]);

  const groups = useMemo(() => groupSourcing(rows, groupBy), [rows, groupBy]);
  const groupTotal = groups.length;
  const groupPageCount = Math.max(1, Math.ceil(groupTotal / pageSize));
  const pageGroups = useMemo(
    () => groups.slice((page - 1) * pageSize, page * pageSize),
    [groups, page, pageSize],
  );

  // An attention filter drops rows after the server counted them, so the
  // server's total would overstate the list. `rows` is the whole matching set
  // in that mode (the fetch covers it), so counting it is exact.
  const total = filters.attention !== null ? rows.length : data?.total ?? 0;

  // Card view normally lets the API paginate; when the client is filtering it
  // has to slice the page itself.
  const cardRows = useMemo(
    () =>
      clientPaginated && !isGrouped
        ? rows.slice((page - 1) * pageSize, page * pageSize)
        : rows,
    [clientPaginated, isGrouped, rows, page, pageSize],
  );
  const cardPageCount = Math.max(1, Math.ceil(total / pageSize));

  const filtered = hasActiveFilters(filters);

  /* --- Attention cards -----------------------------------------------------
     Unfiltered on purpose: "is anything waiting on me" must not change
     because the reader narrowed the table. Both windows are wider than the
     four rows a card shows, since the interesting rows are a subset. */

  // One window serves both the inbox card and the filter pickers below: same
  // sort, and the card wants a subset of what the pickers already need.
  const { data: recentPage, isPending: recentPending } = useSourcingRequests(
    { page: 1, size: GROUPING_FETCH_SIZE, sort: "updated_at", order: "desc" },
    { refetchInterval: POLL_MS },
  );
  const { data: followUpsPage, isPending: followUpsPending } =
    useSourcingRequests(
      { page: 1, size: 25, sort: "follow_up_on", order: "asc" },
      { refetchInterval: POLL_MS },
    );

  /* --- Facets -------------------------------------------------------------
     The supplier and tender pickers list what actually has enquiries against
     it, rather than every company and bid in the database — a filter offering
     choices that return nothing is worse than no filter. Read off the same
     unfiltered window as the inbox card, so with more than 100 live enquiries
     the lists become a recent subset rather than the whole set. */

  const { suppliers, tenders } = useMemo(
    () => facetsOf(recentPage?.items ?? []),
    [recentPage],
  );

  /* --- Handlers ----------------------------------------------------------- */

  function changeFilters(next: SourcingFilterValues) {
    setFilters(next);
    setPage(1);
  }

  function changeStage(next: StageKey | null) {
    const stage = next
      ? PIPELINE_STAGES.find((entry) => entry.key === next)
      : undefined;
    // Picking a stage card is picking a status, and it clears any attention
    // chip — the two are competing answers to "which rows am I looking at".
    changeFilters({
      ...filters,
      status: stage ? stage.statuses[0] : "",
      attention: null,
    });
  }

  function changeSort(next: string) {
    setSort(next);
    setPage(1);
  }

  // List view paginates groups and card view paginates raw requests — page 1
  // in one has no correspondence to page 1 in the other, so a stale page
  // number would show blank results after switching.
  function changeView(next: "list" | "grid") {
    setView(next);
    setPage(1);
  }

  function changeGroupBy(next: GroupBy) {
    setGroupBy(next);
    setPage(1);
  }

  function resetAll() {
    setFilters(EMPTY_SOURCING_FILTERS);
    setPage(1);
  }

  function sync() {
    syncMailbox.mutate(undefined, {
      onSuccess: (result) => {
        if (result.error) {
          // A partial sync still commits what it imported, so this rides on a
          // 200 — report both halves rather than only the failure.
          toast.error(
            `Imported ${result.synced} message${result.synced === 1 ? "" : "s"}, then hit a problem: ${result.error}`,
            { duration: 8000 },
          );
          return;
        }
        toast.success(
          result.synced === 0
            ? "No new supplier replies"
            : `${result.synced} new message${result.synced === 1 ? "" : "s"} imported`,
        );
      },
      onError: (syncError) => {
        toast.error(
          isMailboxReauthError(syncError)
            ? "The mailbox needs reconnecting — open Settings › Mailbox"
            : syncError instanceof Error
              ? syncError.message
              : "Could not check for replies",
          { duration: 8000 },
        );
      },
    });
  }

  function exportCsv() {
    setExporting(true);
    try {
      downloadCsv(rowsToCsv(rows));
    } finally {
      setExporting(false);
    }
  }

  /** The stage card that should read as active — derived from the status
   *  filter, so the strip and the dropdown can never disagree. */
  const activeStage: StageKey | null =
    filters.attention === null && filters.status
      ? PIPELINE_STAGES.find((stage) =>
          stage.statuses.includes(filters.status as SourcingStatus),
        )?.key ?? null
      : null;

  return (
    <div className="space-y-5 sm:space-y-6">
      <SourcingHeader
        onExport={exportCsv}
        exporting={exporting}
        exportDisabled={rows.length === 0}
      />

      <SourcingPipelineStrip
        pipeline={pipeline}
        isPending={pipelinePending}
        activeStage={activeStage}
        onStageSelect={changeStage}
      />

      {/* The three "what is waiting on me" cards, side by side under the
          counters. They are deliberately not driven by the filters below: the
          answer to "is anything waiting on me" must not change because the
          reader narrowed the table to one supplier. */}
      <div className="grid gap-5 lg:grid-cols-3">
        <QuickActionsCard
          onSync={sync}
          syncing={syncMailbox.isPending}
          // No account row at all *is* "disconnected" — but only once the
          // settings have loaded, or a cold render would flash "Connect a
          // mailbox" at someone whose mailbox is fine.
          status={
            mailbox ? mailbox.account?.status ?? "disconnected" : undefined
          }
        />
        <RecentInboxCard
          requests={recentPage?.items ?? []}
          isPending={recentPending}
          onSelect={setSelected}
          onViewAll={() =>
            changeFilters({ ...EMPTY_SOURCING_FILTERS, attention: "awaiting_reply" })
          }
        />
        <FollowUpsCard
          requests={followUpsPage?.items ?? []}
          isPending={followUpsPending}
          onSelect={setSelected}
          onViewAll={() => changeSort("follow_up_on:asc")}
        />
      </div>

      <SourcingFilters
        value={filters}
        onChange={changeFilters}
        suppliers={suppliers}
        tenders={tenders}
        attention={pipeline?.attention}
        sort={sort}
        onSortChange={changeSort}
      />

      <div className="w-full min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
        <SourcingTable
          rows={cardRows}
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
          groupBy={groupBy}
          onGroupByChange={changeGroupBy}
        />

        {(isGrouped ? groupTotal : total) > 0 && (
          <div className="border-t border-border/60 px-4 py-4 sm:px-5">
            <ResultsPagination
              page={clientPaginated ? page : data?.page ?? page}
              pageCount={
                isGrouped
                  ? groupPageCount
                  : clientPaginated
                    ? cardPageCount
                    : data?.pages ?? 1
              }
              total={isGrouped ? groupTotal : total}
              pageSize={pageSize}
              itemLabel={
                isGrouped
                  ? groupBy === "supplier"
                    ? "suppliers"
                    : groupBy === "product"
                      ? "products"
                      : "enquiries"
                  : "results"
              }
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

      {openRequest && (
        <SourcingDetailPanel
          key={openRequest.id}
          request={openRequest}
          onClose={closePanel}
        />
      )}
    </div>
  );
}

/* --- Facets ---------------------------------------------------------------- */

function facetsOf(rows: SourcingRequestListItem[]): {
  suppliers: FacetOption[];
  tenders: FacetOption[];
} {
  const suppliers = new Map<number, string>();
  const tenders = new Map<number, string>();

  for (const row of rows) {
    suppliers.set(row.company.id, row.company.name_en);
    if (row.tender) {
      tenders.set(
        row.tender.id,
        row.tender.reference_no ?? row.tender.name,
      );
    }
  }

  const byLabel = (a: FacetOption, b: FacetOption) =>
    a.label.localeCompare(b.label);

  return {
    suppliers: [...suppliers]
      .map(([id, label]) => ({ id, label }))
      .sort(byLabel),
    tenders: [...tenders].map(([id, label]) => ({ id, label })).sort(byLabel),
  };
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
  "Last Activity",
  "Awaiting Us",
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
        csvField(relativeTime(row.last_activity_at)),
        csvField(row.awaiting_us ? "yes" : "no"),
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
