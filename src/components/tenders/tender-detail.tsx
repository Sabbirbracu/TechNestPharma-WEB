"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  PAGE_SIZES,
  ResultsPagination,
} from "@/components/search/results-pagination";
import {
  AUTHORITY_TYPE_OPTIONS,
  TENDER_STATUS_OPTIONS,
  TenderStatusBadge,
  authorityTypeLabel,
  closingLabel,
} from "@/components/tenders/tender-status";
import {
  useCreateSourcingRequest,
  useRecentActivity,
  useRemoveTenderItem,
  useDeleteTender,
  useSourcingRequests,
  useTender,
  useUpdateTender,
} from "@/lib/queries";
import { MATERIAL_TYPE_LABEL, flagFor } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type {
  ActivityAction,
  ActivityEntry,
  TenderAuthorityType,
  TenderItem,
  TenderStatus,
} from "@/types/api";

/**
 * One tender: its shortlist, its own record, and the audit trail behind it
 * (FR-TENDER-03).
 *
 * The shortlist table groups by product rather than listing flat — the client
 * shortlists two or three suppliers for the same line and then compares them,
 * so the suppliers of one product have to sit together. A flat list sorted by
 * when each row was added scatters exactly the rows that need comparing.
 */

type TabKey = "shortlist" | "details" | "documents" | "activity";

const TABS: { key: TabKey; label: string }[] = [
  { key: "shortlist", label: "Shortlisted Products" },
  { key: "details", label: "Tender Details" },
  { key: "documents", label: "Documents" },
  { key: "activity", label: "Activity Log" },
];

export function TenderDetail({ tenderId }: { tenderId: number }) {
  const router = useRouter();
  const { data: tender, isLoading, error } = useTender(tenderId);
  const updateTender = useUpdateTender(tenderId);
  const deleteTender = useDeleteTender();
  const [tab, setTab] = useState<TabKey>("shortlist");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div
        role="alert"
        className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-12 text-center"
      >
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm font-semibold text-destructive">
          {error instanceof Error ? error.message : "Tender not found"}
        </p>
        <Link href="/tenders" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to tenders
        </Link>
      </div>
    );
  }

  const closing = closingLabel(tender.closing_date);
  const supplierCount = new Set(
    tender.items.map((item) => item.company_id).filter((id): id is number => id !== null),
  ).size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/tenders"
            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to all tenders
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {tender.name}
            </h1>
            <TenderStatusBadge status={tender.status} />
          </div>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {[tender.reference_no, tender.buyer_name].filter(Boolean).join(" · ") ||
              "No reference number on file"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <MoreHorizontal className="size-4" strokeWidth={2.25} />
                More
              </button>
            )}
          >
            {(close) => (
              <>
                <DropdownMenuLabel>Set status</DropdownMenuLabel>
                {TENDER_STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      updateTender.mutate({ status: option.value });
                      close();
                    }}
                  >
                    {option.value === tender.status ? (
                      <Check className="text-primary" />
                    ) : (
                      <span className="size-4 shrink-0" />
                    )}
                    {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onClick={() => {
                    close();
                    setConfirmingDelete(true);
                  }}
                >
                  <Trash2 />
                  Delete tender
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>

          <Link href="/search" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Search className="size-3.5" />
            Add from search
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Package}
          tile="bg-tile-green-bg text-tile-green ring-tile-green/15"
          label="Shortlisted entries"
          value={tender.item_count}
          actionLabel="View all"
          onAction={() => setTab("shortlist")}
        />
        <StatTile
          icon={FlaskConical}
          tile="bg-tile-blue-bg text-tile-blue ring-tile-blue/15"
          label="Products"
          value={tender.product_count}
          actionLabel="View all"
          onAction={() => setTab("shortlist")}
        />
        <StatTile
          icon={Users}
          tile="bg-tile-purple-bg text-tile-purple ring-tile-purple/15"
          label="Suppliers involved"
          value={supplierCount}
          actionLabel="View all"
          onAction={() => setTab("shortlist")}
        />
        <StatTile
          icon={CalendarClock}
          tile="bg-tile-amber-bg text-tile-amber ring-tile-amber/15"
          label="Closing date"
          value={
            tender.closing_date
              ? new Date(tender.closing_date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "No date"
          }
          caption={closing?.text}
          urgent={closing?.urgent}
          actionLabel="View details"
          onAction={() => setTab("details")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="overflow-x-auto border-b border-border/60 px-5">
            <div className="flex min-w-max gap-1">
              {TABS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setTab(entry.key)}
                  className={cn(
                    "relative px-3.5 py-3 text-sm font-semibold transition-colors focus-visible:outline-none",
                    tab === entry.key
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {entry.label}
                  {tab === entry.key && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {tab === "shortlist" && (
              <ShortlistedProductsPanel tenderId={tenderId} items={tender.items} />
            )}
            {tab === "details" && (
              <TenderDetailsPanel
                tender={tender}
                onSave={(payload) => updateTender.mutateAsync(payload)}
                saving={updateTender.isPending}
              />
            )}
            {tab === "documents" && <DocumentsPanel />}
            {tab === "activity" && <ActivityLogPanel tenderId={tenderId} />}
          </div>
        </div>

        <div className="space-y-5">
          <TenderInfoCard tender={tender} onEdit={() => setTab("details")} />
          <RecentActivityCard tenderId={tenderId} onViewAll={() => setTab("activity")} />
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this tender?"
          description={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{tender.name}&quot;
              </span>
              ? This cannot be undone from here.
            </>
          }
          confirmLabel="Delete"
          busy={deleteTender.isPending}
          onConfirm={() => {
            deleteTender.mutate(tenderId, {
              onSuccess: () => router.push("/tenders"),
            });
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat tiles                                                                  */
/* -------------------------------------------------------------------------- */

function StatTile({
  icon: Icon,
  tile,
  label,
  value,
  caption,
  urgent,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tile: string;
  label: string;
  value: string | number;
  caption?: string;
  urgent?: boolean;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            tile,
          )}
        >
          <Icon className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
        </div>
      </div>
      {caption && (
        <p
          className={cn(
            "mt-2 text-[11px] font-semibold",
            urgent ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {caption}
        </p>
      )}
      <button
        type="button"
        onClick={onAction}
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80"
      >
        {actionLabel}
        <ArrowRight className="size-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shortlisted Products tab                                                    */
/* -------------------------------------------------------------------------- */

type ProductGroupData = {
  productId: number;
  productName: string;
  productNameCn: string | null;
  casNumber: string | null;
  items: TenderItem[];
};

function groupByProduct(
  items: TenderItem[],
  filter: string,
  supplierId: number | "",
): ProductGroupData[] {
  const needle = filter.trim().toLowerCase();
  let matching = items;
  if (supplierId !== "") {
    matching = matching.filter((item) => item.company_id === supplierId);
  }
  if (needle) {
    matching = matching.filter((item) =>
      [item.product_name, item.product_name_cn, item.cas_number, item.company_name]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }

  const groups = new Map<number, ProductGroupData>();
  for (const item of matching) {
    const existing = groups.get(item.product_id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(item.product_id, {
      productId: item.product_id,
      productName: item.product_name,
      productNameCn: item.product_name_cn,
      casNumber: item.cas_number,
      items: [item],
    });
  }
  return [...groups.values()];
}

const CSV_COLUMNS = [
  "Product",
  "CAS No.",
  "Supplier",
  "Country",
  "Specification",
  "Material Type",
  "Quantity",
  "Note",
] as const;

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function itemsToCsv(items: TenderItem[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const item of items) {
    lines.push(
      [
        csvField(item.product_name),
        csvField(item.cas_number),
        csvField(item.company_name),
        csvField(item.country),
        csvField(item.specification),
        csvField(item.material_type ? MATERIAL_TYPE_LABEL[item.material_type] : ""),
        csvField([item.quantity, item.quantity_unit].filter(Boolean).join(" ")),
        csvField(item.note),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/** The BOM is deliberate: without it Excel on Windows reads the file as the
 *  system codepage and mangles every Chinese supplier name. */
function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Identifies a (product, supplier) pair regardless of which table it's
 *  looked up in — a tender item and a sourcing request key the same way. */
function sourcingKey(productId: number, companyId: number): string {
  return `${productId}:${companyId}`;
}

function ShortlistedProductsPanel({
  tenderId,
  items,
}: {
  tenderId: number;
  items: TenderItem[];
}) {
  const [filter, setFilter] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Every sourcing request already open against this tender, so the "Start
  // Sourcing" action can skip suppliers that already have one instead of
  // creating a duplicate inquiry. 100 is `/sourcing/requests`' own page-size
  // ceiling (settings.max_page_size) — this table's own PAGE_SIZES tops out
  // higher, so it can't be reused here.
  const { data: sourcingData } = useSourcingRequests({
    tender_id: tenderId,
    size: 100,
  });
  const sourcedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const request of sourcingData?.items ?? []) {
      keys.add(sourcingKey(request.product.id, request.company.id));
    }
    return keys;
  }, [sourcingData]);

  const suppliers = useMemo(() => {
    const byId = new Map<number, string>();
    for (const item of items) {
      if (item.company_id && item.company_name) byId.set(item.company_id, item.company_name);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const groups = useMemo(
    () => groupByProduct(items, filter, supplierId),
    [items, filter, supplierId],
  );

  function changeFilter(next: string) {
    setFilter(next);
    setPage(1);
  }

  function changeSupplier(next: number | "") {
    setSupplierId(next);
    setPage(1);
  }

  function exportCsv() {
    const rows = groups.flatMap((group) => group.items);
    downloadCsv(
      `tender-${tenderId}-shortlist-${new Date().toISOString().slice(0, 10)}.csv`,
      itemsToCsv(rows),
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nothing shortlisted yet"
        description="Search for a product, then use Shortlist on any result to add it — with its supplier — to this tender."
      >
        <Link href="/search" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Search className="size-4" />
          Go to search
        </Link>
      </EmptyState>
    );
  }

  const total = groups.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageGroups = groups.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(event) => changeFilter(event.target.value)}
            placeholder="Filter shortlisted products…"
            className="pl-9"
            aria-label="Filter shortlisted products"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              value={supplierId}
              onChange={(event) =>
                changeSupplier(event.target.value === "" ? "" : Number(event.target.value))
              }
              aria-label="Filter by supplier"
              className="h-9 text-xs"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv} className="h-9">
            <Download className="size-3.5" strokeWidth={2.25} />
            Export
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing on this tender matches these filters.
        </p>
      ) : (
        <>
          <ShortlistTable groups={pageGroups} tenderId={tenderId} sourcedKeys={sourcedKeys} />
          <ResultsPagination
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            itemLabel="products"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}

function ShortlistTable({
  groups,
  tenderId,
  sourcedKeys,
}: {
  groups: ProductGroupData[];
  tenderId: number;
  sourcedKeys: Set<string>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[55%]" />
          <col className="w-[260px]" />
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className="border-b border-border/60 bg-secondary/40">
            <HeaderCell>Product / CAS No.</HeaderCell>
            <HeaderCell>Supplier</HeaderCell>
            <HeaderCell className="text-right">Actions</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) => (
            <ProductRows
              key={group.productId}
              group={group}
              tenderId={tenderId}
              isLastGroup={groupIndex === groups.length - 1}
              sourcedKeys={sourcedKeys}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One `<tr>` per supplier — a product with several suppliers shows them
 *  stacked row by row (not folded behind a click), since comparing suppliers
 *  side by side is the whole point of shortlisting more than one. Only the
 *  product cell spans the group, so the name and CAS aren't repeated.
 *
 *  Dividers get two different weights so the eye can tell "another supplier,
 *  same product" from "next product": a light dashed line between rows that
 *  share a product cell, a solid one where a new product starts. */
function ProductRows({
  group,
  tenderId,
  isLastGroup,
  sourcedKeys,
}: {
  group: ProductGroupData;
  tenderId: number;
  isLastGroup: boolean;
  sourcedKeys: Set<string>;
}) {
  const removeItem = useRemoveTenderItem();
  const createSourcing = useCreateSourcingRequest();
  const router = useRouter();
  const [startingSourcing, setStartingSourcing] = useState(false);
  const materialTypes = new Set(group.items.map((item) => item.material_type).filter(Boolean));

  const withSupplier = group.items.filter(
    (item): item is TenderItem & { company_id: number } => item.company_id !== null,
  );
  const notYetSourced = withSupplier.filter(
    (item) => !sourcedKeys.has(sourcingKey(group.productId, item.company_id)),
  );

  /** One `POST /sourcing/requests` per supplier still missing one — there is
   *  no bulk endpoint, so this fans out the same way bulk delete does
   *  elsewhere in the app. Suppliers that already have a request are left
   *  alone, so a second click never files a duplicate inquiry. */
  async function startSourcing() {
    if (notYetSourced.length === 0) return;
    setStartingSourcing(true);
    const results = await Promise.allSettled(
      notYetSourced.map((item) =>
        createSourcing.mutateAsync({
          product_id: group.productId,
          company_id: item.company_id,
          tender_id: tenderId,
          supplier_product_id: item.supplier_product_id,
          required_quantity: item.quantity,
          quantity_unit: item.quantity_unit,
          required_specification: item.specification,
        }),
      ),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    const succeeded = results.length - failed;
    setStartingSourcing(false);

    if (succeeded === 0) {
      toast.error(`Could not start sourcing for "${group.productName}"`, { duration: 6000 });
      return;
    }
    if (failed === 0) {
      toast.success(
        `Started sourcing with ${succeeded} supplier${succeeded === 1 ? "" : "s"} for "${group.productName}"`,
        { duration: 6000 },
      );
    } else {
      toast.error(
        `Started sourcing with ${succeeded} of ${results.length} suppliers — ${failed} failed`,
        { duration: 6000 },
      );
    }
    router.push("/sourcing");
  }

  return (
    <>
      {group.items.map((item, index) => {
        const removing = removeItem.isPending && removeItem.variables?.itemId === item.id;
        const isLastInGroup = index === group.items.length - 1;
        return (
          <tr
            key={item.id}
            className={cn(
              "transition-colors hover:bg-accent/25",
              isLastInGroup
                ? !isLastGroup && "border-b-2 border-border"
                : "border-b border-dashed border-border/40",
            )}
          >
            {index === 0 && (
              <td
                rowSpan={group.items.length}
                className="min-w-0 border-r border-border/30 px-3 py-3.5 align-top"
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tile-green-bg text-tile-green ring-1 ring-inset ring-tile-green/15">
                    <FlaskConical className="size-[18px]" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="break-words text-sm font-bold text-foreground"
                      title={group.productName}
                    >
                      {group.productName}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-muted-foreground">
                      {group.productNameCn && <span>{group.productNameCn}</span>}
                      <span className="font-mono tabular-nums">CAS {group.casNumber || "N/A"}</span>
                    </p>
                    {materialTypes.size === 1 && (
                      <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {MATERIAL_TYPE_LABEL[[...materialTypes][0]!]}
                      </span>
                    )}
                    {withSupplier.length > 0 &&
                      (notYetSourced.length > 0 ? (
                        <button
                          type="button"
                          onClick={startSourcing}
                          disabled={startingSourcing}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
                        >
                          {startingSourcing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" strokeWidth={2.25} />
                          )}
                          Start Sourcing ({notYetSourced.length})
                        </button>
                      ) : (
                        <Link
                          href="/sourcing"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-success hover:underline"
                        >
                          <Send className="size-3.5" strokeWidth={2.25} />
                          Sourcing started — view
                        </Link>
                      ))}
                  </div>
                </div>
              </td>
            )}

            <td className="min-w-0 px-3 py-3 align-top">
              {item.company_id ? (
                <Link
                  href={`/companies/${item.company_id}`}
                  className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-foreground underline-offset-2 hover:underline"
                >
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.company_name}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold italic text-muted-foreground">
                  <Building2 className="size-3.5" />
                  No supplier chosen
                </span>
              )}
              {item.country && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  {flagFor(item.country_code) && <span aria-hidden>{flagFor(item.country_code)}</span>}
                  {item.country}
                </p>
              )}
              {item.company_id && sourcedKeys.has(sourcingKey(group.productId, item.company_id)) && (
                <span className="mt-1 inline-block rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                  Sourcing started
                </span>
              )}
            </td>

            <td className="px-3 py-3 align-top" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-end">
                <DropdownMenu
                  trigger={(props) => (
                    <button
                      type="button"
                      {...props}
                      aria-label={`Actions for ${item.company_name ?? group.productName}`}
                      className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {removing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="size-4" strokeWidth={2.25} />
                      )}
                    </button>
                  )}
                >
                  {(close) => (
                    <DropdownMenuItem
                      destructive
                      onClick={() => {
                        close();
                        removeItem.mutate({ tenderId, itemId: item.id });
                      }}
                    >
                      <Trash2 />
                      Remove from tender
                    </DropdownMenuItem>
                  )}
                </DropdownMenu>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

function HeaderCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn("px-3 py-3 text-left text-xs font-bold text-foreground", className)}
    >
      {children}
    </th>
  );
}

/* -------------------------------------------------------------------------- */
/* Tender Details tab                                                          */
/* -------------------------------------------------------------------------- */

function TenderDetailsPanel({
  tender,
  onSave,
  saving,
}: {
  tender: {
    name: string;
    reference_no: string | null;
    buyer_name: string | null;
    authority_type: TenderAuthorityType | null;
    closing_date: string | null;
    status: TenderStatus;
    notes: string | null;
  };
  onSave: (payload: {
    name?: string;
    reference_no?: string | null;
    buyer_name?: string | null;
    authority_type?: TenderAuthorityType | null;
    closing_date?: string | null;
    status?: TenderStatus;
    notes?: string | null;
  }) => Promise<unknown>;
  saving: boolean;
}) {
  const [name, setName] = useState(tender.name);
  const [reference, setReference] = useState(tender.reference_no ?? "");
  const [buyer, setBuyer] = useState(tender.buyer_name ?? "");
  const [authorityType, setAuthorityType] = useState<TenderAuthorityType | "">(
    tender.authority_type ?? "",
  );
  const [closing, setClosing] = useState(tender.closing_date ?? "");
  const [status, setStatus] = useState<TenderStatus>(tender.status);
  const [notes, setNotes] = useState(tender.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        reference_no: reference.trim() || null,
        buyer_name: buyer.trim() || null,
        authority_type: authorityType || null,
        closing_date: closing || null,
        status,
        notes: notes.trim() || null,
      });
      toast.success("Tender details saved", { duration: 5000 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save these details");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tender name" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Reference no.">
          <Input value={reference} onChange={(event) => setReference(event.target.value)} />
        </Field>
        <Field label="Buying authority">
          <Input value={buyer} onChange={(event) => setBuyer(event.target.value)} />
        </Field>
        <Field label="Authority type">
          <Select
            value={authorityType}
            onChange={(event) => setAuthorityType(event.target.value as TenderAuthorityType | "")}
          >
            <option value="">Unspecified</option>
            {AUTHORITY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Closing date">
          <Input type="date" value={closing} onChange={(event) => setClosing(event.target.value)} />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as TenderStatus)}>
            {TENDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything worth recording about this tender"
            className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-border/60 pt-4">
        <Button type="submit" size="sm" disabled={!name.trim() || saving}>
          {saving && <Loader2 className="animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Documents tab (stub — documents don't link to tenders yet)                 */
/* -------------------------------------------------------------------------- */

function DocumentsPanel() {
  return (
    <EmptyState
      icon={FileText}
      title="Documents aren't linked to tenders yet"
      description="For now, attach the tender notice or a supplier's quotation to the relevant sourcing request instead — tender-level document uploads are coming in a later update."
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Activity Log tab + Recent Activity card                                    */
/* -------------------------------------------------------------------------- */

/** Reads the shared feed and keeps only entries about this tender (or its
 *  items/sourcing/quotations) — the feed has no server-side per-entity
 *  filter yet, but every entry already carries the href its row would open. */
function useTenderActivity(tenderId: number, limit: number) {
  const { data, isLoading } = useRecentActivity(limit);
  const entries = useMemo(
    () => (data ?? []).filter((entry) => entry.href === `/tenders/${tenderId}`),
    [data, tenderId],
  );
  return { entries, isLoading };
}

function formatActivityTime(occurredAt: string): string {
  const date = new Date(occurredAt);
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} • ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/** "Sabbir Ahmad" → "SA" — same rule as the sidebar's own avatar chip
 *  (`initialsOf` in lib/auth.tsx), just fed a plain name instead of the
 *  current-user object, since a feed row's actor isn't the signed-in user. */
function initialsFromName(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Color per action, so a glance down the timeline tells create from delete
 *  without reading every sentence — green for new, red for gone, blue for
 *  everything else that changed. */
const ACTIVITY_DOT_COLOR: Partial<Record<ActivityAction, string>> = {
  create: "bg-tile-green",
  delete: "bg-destructive",
  update: "bg-tile-blue",
  upload: "bg-tile-purple",
  import: "bg-tile-purple",
  export: "bg-tile-amber",
  download: "bg-tile-amber",
};

function dotColorForAction(action: ActivityAction): string {
  return ACTIVITY_DOT_COLOR[action] ?? "bg-muted-foreground";
}

/** Who did it — several people share this database, so a feed row without an
 *  actor is ambiguous the moment more than one person touches a tender. */
function ActivityAvatar({ name, className }: { name: string | null; className?: string }) {
  return (
    <span
      title={name ?? "Unknown user"}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary ring-1 ring-inset ring-primary/20",
        className,
      )}
    >
      {initialsFromName(name)}
    </span>
  );
}

function ActivityLogPanel({ tenderId }: { tenderId: number }) {
  const { entries, isLoading } = useTenderActivity(tenderId, 50);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        No activity recorded yet for this tender.
      </p>
    );
  }

  return (
    <ul>
      {entries.map((entry, index) => (
        <ActivityRow key={entry.id} entry={entry} isLast={index === entries.length - 1} />
      ))}
    </ul>
  );
}

/** A vertical rail down the left — the dot marks the event, colored by
 *  `action` (see `dotColorForAction`); the line below it is skipped on the
 *  last row so the rail doesn't dangle past the final entry. */
function ActivityRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "mt-2 size-2.5 shrink-0 rounded-full ring-4 ring-card",
            dotColorForAction(entry.action),
          )}
        />
        {!isLast && <span className="w-px flex-1 bg-border" />}
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border border-border/50 bg-card px-3.5 py-3",
          !isLast && "mb-3",
        )}
      >
        <div className="flex items-center gap-2">
          <ActivityAvatar name={entry.user_name} className="size-6 text-[10px]" />
          <p className="text-xs font-bold text-foreground">{entry.user_name ?? "Unknown user"}</p>
        </div>
        <p className="mt-1.5 text-sm font-medium text-foreground">{entry.description}</p>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          {formatActivityTime(entry.occurred_at)}
        </p>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Right sidebar cards                                                         */
/* -------------------------------------------------------------------------- */

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function TenderInfoCard({
  tender,
  onEdit,
}: {
  tender: {
    buyer_name: string | null;
    reference_no: string | null;
    authority_type: TenderAuthorityType | null;
    status: TenderStatus;
    created_at: string;
    updated_at: string;
  };
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Tender Information</h2>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit tender information"
          className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Pencil className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>

      <dl className="space-y-3 text-sm">
        <InfoRow label="Authority" value={tender.buyer_name ?? "—"} />
        <InfoRow label="Reference No." value={tender.reference_no ?? "—"} mono />
        <InfoRow label="Tender Type" value={authorityTypeLabel(tender.authority_type)} />
        <InfoRow label="Status" value={<TenderStatusBadge status={tender.status} />} />
        <InfoRow label="Created On" value={formatDate(tender.created_at)} />
        <InfoRow label="Last Updated" value={formatDate(tender.updated_at)} />
      </dl>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-right text-xs font-bold text-foreground", mono && "font-mono")}>
        {value}
      </dd>
    </div>
  );
}

function RecentActivityCard({
  tenderId,
  onViewAll,
}: {
  tenderId: number;
  onViewAll: () => void;
}) {
  const { entries, isLoading } = useTenderActivity(tenderId, 50);
  const recent = entries.slice(0, 4);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Recent Activity</h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-primary hover:text-primary/80"
          >
            View all
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : recent.length === 0 ? (
        <p className="text-xs font-medium text-muted-foreground">
          Nothing recorded yet — activity will show up here as this tender is worked.
        </p>
      ) : (
        <ul>
          {recent.map((entry, index) => {
            const isLast = index === recent.length - 1;
            return (
              <li key={entry.id} className="flex gap-2.5">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "mt-1 size-2 shrink-0 rounded-full",
                      dotColorForAction(entry.action),
                    )}
                  />
                  {!isLast && <span className="w-px flex-1 bg-border" />}
                </div>
                <div className={cn("min-w-0 flex-1", !isLast && "pb-3")}>
                  <div className="flex items-center gap-1.5">
                    <ActivityAvatar name={entry.user_name} className="size-5 text-[8px]" />
                    <p className="text-[10px] font-bold text-foreground">
                      {entry.user_name ?? "Unknown user"}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground">
                    {entry.description}
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                    {formatActivityTime(entry.occurred_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
