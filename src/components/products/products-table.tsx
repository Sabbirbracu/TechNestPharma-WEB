"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  Inbox,
  LayoutGrid,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Search as SearchIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  PAGE_SIZES,
  ResultsPagination,
} from "@/components/search/results-pagination";
import {
  groupMemberships,
  shortlistKey,
  ShortlistMenu,
} from "@/components/tenders/shortlist-menu";
import {
  useDeleteProduct,
  useProducts,
  useShortlistMemberships,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  EMPTY_FILTERS,
  ProductFilters,
  type ProductFilterValues,
} from "./product-filters";
import {
  ProductDetailsDialog,
  formatAddedOn,
  specEntries,
} from "./product-details-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import {
  downloadCsv,
  exportFilename,
  fetchAllProducts,
  productsToCsv,
} from "./product-export";
import {
  applicationLabel,
  flagEmoji,
  primaryCategory,
} from "./product-taxonomy";
import type {
  PackagingSpec,
  ProductFacets,
  ProductListItem,
  ProductListParams,
} from "@/types/api";

/**
 * The products catalogue.
 *
 * Filtering, sorting, and paging all run server-side — unlike the search
 * screen, which filters a single response client-side. The difference is size:
 * search returns one page of matches for a term, while this lists thousands of
 * products, so narrowing has to happen in the database.
 *
 * Selection is deliberately per-page. A "select all 2,487" that only ever held
 * the 10 ids on screen would lie about what a bulk action is about to touch.
 */

type SortValue =
  | "name_en:asc"
  | "name_en:desc"
  | "cas_number:asc"
  | "created_at:desc"
  | "created_at:asc";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "name_en:asc", label: "Product Name (A-Z)" },
  { value: "name_en:desc", label: "Product Name (Z-A)" },
  { value: "cas_number:asc", label: "CAS Number" },
  { value: "created_at:desc", label: "Newest First" },
  { value: "created_at:asc", label: "Oldest First" },
];

/** Which column set the table shows. Chemicals and packaging materials read
 *  the catalogue differently enough that one fixed column set serves neither
 *  well: a chemical's CAS/Therapeutic Class mean nothing for a packaging
 *  item, and packaging's Supplier/Variants mean nothing for a chemical.
 *  "all" (the unfiltered "All Types" pick) keeps the original blended set. */
type ProductViewMode = "chemical" | "packaging" | "all";

function viewModeOf(isPackaging: ProductFilterValues["isPackaging"]): ProductViewMode {
  if (isPackaging === "false") return "chemical";
  if (isPackaging === "true") return "packaging";
  return "all";
}

/** The catalogue opens on Chemicals rather than the unfiltered "All Types" —
 *  chemicals are the common case, and packaging materials read the table
 *  differently enough (see ProductViewMode) that starting unfiltered would
 *  show a blended, less useful column set. */
const DEFAULT_FILTERS: ProductFilterValues = { ...EMPTY_FILTERS, isPackaging: "false" };

export function ProductsTable() {
  const [filters, setFilters] = useState<ProductFilterValues>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortValue>("name_en:asc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Which family rows are showing their variants inline — a size/colour
  // breakdown fetched on demand, not shipped with the page (see VariantRows).
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [inspecting, setInspecting] = useState<ProductListItem | null>(null);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteProduct = useDeleteProduct();

  const [sortField, sortOrder] = sort.split(":") as [string, "asc" | "desc"];
  const mode = viewModeOf(filters.isPackaging);

  const params: ProductListParams = {
    q: filters.q || undefined,
    material_type: filters.materialType || undefined,
    pkg_type: filters.pkgType || undefined,
    is_packaging:
      filters.isPackaging === "" ? undefined : filters.isPackaging === "true",
    sort: sortField,
    order: sortOrder,
    page,
    size: pageSize,
  };

  const { data, isFetching, error } = useProducts(params);
  // Memoised so the empty-list fallback is not a fresh array on every render —
  // the membership fetch below keys off these ids.
  const rows = useMemo(() => data?.items ?? [], [data]);

  // Which tenders the rows on this page already sit on — one request for the
  // page, not one per bookmark button.
  const productIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const { data: memberships } = useShortlistMemberships(productIds);
  const membershipsByRow = useMemo(
    () => groupMemberships(memberships),
    [memberships],
  );

  // Anything that changes *which* products are listed sends the reader back to
  // page one, and drops a selection that no longer refers to what is on screen.
  function changeFilters(next: ProductFilterValues) {
    setFilters(next);
    setPage(1);
    setSelected(new Set());
  }

  function changeSort(next: SortValue) {
    setSort(next);
    setPage(1);
    setSelected(new Set());
  }

  function toggleRow(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: number) {
    setExpanded((current) => {
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

  function toggleAllOnPage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      // A selection means "these rows"; no selection means "everything the
      // current filters match", which is what the count above the table says.
      const exportRows = selected.size
        ? rows.filter((row) => selected.has(row.id))
        : (await fetchAllProducts(params)).rows;
      downloadCsv(exportFilename(), productsToCsv(exportRows));
    } catch (cause) {
      setExportError(
        cause instanceof Error ? cause.message : "Could not build the export.",
      );
    } finally {
      setExporting(false);
    }
  }

  /** One DELETE per id (there is no bulk endpoint) — `allSettled` so one bad
   *  id in a batch of twenty doesn't stop the other nineteen from going through. */
  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const label = `${ids.length} product${ids.length === 1 ? "" : "s"}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map((id) => deleteProduct.mutateAsync(id)),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    const succeeded = results.length - failed;

    if (failed === 0) {
      toast.success(`Deleted ${label}`, { duration: 6000 });
    } else if (succeeded === 0) {
      toast.error(`Could not delete ${label}`, { duration: 6000 });
    } else {
      toast.error(
        `Deleted ${succeeded} of ${results.length} products — ${failed} failed`,
        { duration: 6000 },
      );
    }
    setSelected(new Set());
    setDeleting(false);
  }

  const total = data?.total ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <ProductFilters value={filters} onChange={changeFilters} />

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-sm font-medium text-muted-foreground">
            <span className="font-bold tabular-nums text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            products found
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCsv}
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
                active={view === "grid"}
                onClick={() => setView("grid")}
                label="Card view"
                icon={<LayoutGrid className="size-4" strokeWidth={2.25} />}
              />
              <ViewToggle
                active={view === "list"}
                onClick={() => setView("list")}
                label="Table view"
                icon={<List className="size-4" strokeWidth={2.25} />}
              />
            </div>

            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                Sort by:
              </span>
              <select
                value={sort}
                onChange={(event) => changeSort(event.target.value as SortValue)}
                aria-label="Sort products"
                className="h-9 cursor-pointer rounded-lg border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {exportError && (
          <p
            role="alert"
            className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/5 px-5 py-2.5 text-xs font-semibold text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" strokeWidth={2} />
            {exportError}
          </p>
        )}

        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onClear={() => setSelected(new Set())}
            onExport={exportCsv}
            exporting={exporting}
            onDelete={bulkDelete}
            deleting={deleting}
          />
        )}

        {/* Body */}
        {error ? (
          <TableError error={error} />
        ) : isFetching && !data ? (
          <TableLoading />
        ) : rows.length === 0 ? (
          <TableEmpty
            filtered={
              filters.q !== "" ||
              filters.materialType !== "" ||
              filters.pkgType !== "" ||
              filters.isPackaging !== ""
            }
            onReset={() => changeFilters(EMPTY_FILTERS)}
          />
        ) : (
          <div
            className={cn(
              "transition-opacity duration-200",
              isFetching && "pointer-events-none opacity-60",
            )}
          >
            {view === "list" ? (
              <ProductTableView
                rows={rows}
                mode={mode}
                sort={sort}
                onSortChange={changeSort}
                selected={selected}
                onToggleRow={toggleRow}
                allOnPageSelected={allOnPageSelected}
                someOnPageSelected={
                  selectedOnPage.length > 0 && !allOnPageSelected
                }
                onToggleAll={toggleAllOnPage}
                membershipsByRow={membershipsByRow}
                onInspect={setInspecting}
                onEdit={setEditing}
                expanded={expanded}
                onToggleExpanded={toggleExpanded}
              />
            ) : (
              <ProductCardView
                rows={rows}
                mode={mode}
                selected={selected}
                onToggleRow={toggleRow}
                membershipsByRow={membershipsByRow}
                onInspect={setInspecting}
                onEdit={setEditing}
                expanded={expanded}
                onToggleExpanded={toggleExpanded}
              />
            )}
          </div>
        )}

        {/* Footer */}
        {total > 0 && (
          <div className="border-t border-border/60 px-4 py-4 sm:px-5">
            <ResultsPagination
              page={data?.page ?? page}
              pageCount={data?.pages ?? 1}
              total={total}
              pageSize={pageSize}
              onPageChange={(next) => {
                setPage(next);
                // Scroll back to the top of the list: paging while scrolled
                // halfway down lands the reader in the middle of new rows.
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

      {inspecting && (
        <ProductDetailsDialog
          product={inspecting}
          open
          onClose={() => setInspecting(null)}
        />
      )}

      {/* Reachable from the row menu without opening the details view first;
          the form fetches the full record itself. */}
      {editing && (
        <ProductFormDialog
          open
          onClose={() => setEditing(null)}
          product={editing}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Table view                                                                 */
/* -------------------------------------------------------------------------- */

type RowProps = {
  rows: ProductListItem[];
  mode: ProductViewMode;
  selected: Set<number>;
  onToggleRow: (id: number) => void;
  membershipsByRow: ReturnType<typeof groupMemberships>;
  onInspect: (product: ProductListItem) => void;
  onEdit: (product: ProductListItem) => void;
  expanded: Set<number>;
  onToggleExpanded: (id: number) => void;
};

function ProductTableView({
  rows,
  mode,
  sort,
  onSortChange,
  selected,
  onToggleRow,
  allOnPageSelected,
  someOnPageSelected,
  onToggleAll,
  membershipsByRow,
  onInspect,
  onEdit,
  expanded,
  onToggleExpanded,
}: RowProps & {
  sort: SortValue;
  onSortChange: (sort: SortValue) => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onToggleAll: () => void;
}) {
  const nameSorted = sort.startsWith("name_en");
  const showCas = mode !== "packaging";
  const showVariants = mode !== "chemical";
  // "all" keeps Applications (a substance is an API to one supplier and an
  // excipient to another — offer-level, so it stays offer-level); Chemicals
  // swaps it for the product's own Therapeutic Class; Packaging drops it for
  // Supplier, since neither means anything for a packaging item.
  const middleColumn =
    mode === "chemical" ? "therapeutic" : mode === "packaging" ? "supplier" : "applications";
  // checkbox, name, material type, country, middle column, added on, actions
  // are always present (7); CAS and Variants are the two that toggle off.
  const columnCount = 7 + (showCas ? 1 : 0) + (showVariants ? 1 : 0);

  return (
    <div className="overflow-x-auto">
      {/* `table-fixed` plus an explicit column plan: product names in this
          catalogue run to full IUPAC strings ("(1R,2S)-2-[[(2,4-dimethyl-…"),
          and on `auto` layout one of them widens the first column until the
          right-hand columns fall off the viewport. Fixed widths make the name
          truncate instead, so all columns stay visible. `min-w` is set below
          the typical 13"-15" laptop content width (sidebar + padding taken out
          of ~1280px) so the table fills the screen instead of needing its own
          horizontal scrollbar there; it still scrolls rather than squashing
          on anything narrower. */}
      <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-11" />
          <col className="w-[210px]" />
          <col className="w-[120px]" />
          {showCas && <col className="w-32" />}
          <col className="w-[118px]" />
          <col className="w-40" />
          <col className="w-[112px]" />
          {showVariants && <col className="w-[92px]" />}
          <col className="w-[104px]" />
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
                    : "Select every product on this page"
                }
              />
            </th>
            <th scope="col" className="px-4 py-3.5 text-left">
              <button
                type="button"
                onClick={() =>
                  onSortChange(
                    sort === "name_en:asc" ? "name_en:desc" : "name_en:asc",
                  )
                }
                aria-label="Sort by product name"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                Product Name
                {!nameSorted ? (
                  <ChevronsUpDown
                    className="size-3.5 text-muted-foreground"
                    strokeWidth={2.25}
                  />
                ) : sort === "name_en:asc" ? (
                  <ArrowDownAZ className="size-3.5 text-primary" strokeWidth={2.25} />
                ) : (
                  <ArrowUpAZ className="size-3.5 text-primary" strokeWidth={2.25} />
                )}
              </button>
            </th>
            <HeaderCell>Material Type</HeaderCell>
            {showCas && <HeaderCell>CAS No.</HeaderCell>}
            <HeaderCell>Country</HeaderCell>
            <HeaderCell>
              {middleColumn === "therapeutic"
                ? "Therapeutic Class"
                : middleColumn === "supplier"
                  ? "Supplier"
                  : "Applications"}
            </HeaderCell>
            <HeaderCell>Added On</HeaderCell>
            {showVariants && <HeaderCell>Variants</HeaderCell>}
            <HeaderCell className="text-right">Actions</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const category = primaryCategory(row.material_type, row.is_packaging);
            const Icon = category.icon;
            const isSelected = selected.has(row.id);
            const hasVariants = showVariants && row.variant_count > 0;
            const isExpanded = hasVariants && expanded.has(row.id);

            return (
              <Fragment key={row.id}>
                <tr
                  className={cn(
                    "border-b border-border/40 transition-colors",
                    isExpanded ? "border-b-0" : "last:border-0",
                    isSelected ? "bg-primary/[0.04]" : "hover:bg-accent/40",
                  )}
                >
                <td className="overflow-hidden px-4 py-4">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleRow(row.id)}
                    aria-label={`Select ${row.name_en}`}
                  />
                </td>

                <td className="overflow-hidden px-4 py-4">
                  <div className="flex items-center gap-3">
                    {hasVariants ? (
                      <button
                        type="button"
                        onClick={() => onToggleExpanded(row.id)}
                        aria-label={
                          isExpanded
                            ? `Hide variants of ${row.name_en}`
                            : `Show ${row.variant_count} variants of ${row.name_en}`
                        }
                        aria-expanded={isExpanded}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" strokeWidth={2.5} />
                        ) : (
                          <ChevronRight className="size-4" strokeWidth={2.5} />
                        )}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                          category.tile,
                        )}
                      >
                        <Icon className="size-[18px]" strokeWidth={2} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onInspect(row)}
                        className="block w-full truncate text-left text-sm font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        title={row.name_en}
                      >
                        {row.name_en}
                      </button>
                      {subtitleOf(row) && (
                        <p
                          className="truncate text-xs font-medium text-muted-foreground"
                          title={subtitleOf(row) ?? undefined}
                        >
                          {subtitleOf(row)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                <td className="overflow-hidden px-4 py-4">
                  <CategoryCell row={row} />
                </td>

                {showCas && (
                  <td className="overflow-hidden px-4 py-4">
                    {row.cas_number ? (
                      <span
                        className="block truncate font-mono text-xs tabular-nums text-foreground"
                        title={row.cas_number}
                      >
                        {row.cas_number}
                      </span>
                    ) : (
                      <Dash />
                    )}
                  </td>
                )}

                <td className="overflow-hidden px-4 py-4">
                  <CountryCell row={row} />
                </td>

                <td className="overflow-hidden px-4 py-4">
                  {middleColumn === "supplier" ? (
                    <SupplierCell row={row} />
                  ) : (() => {
                      const text =
                        middleColumn === "therapeutic"
                          ? therapeuticClassesOf(row)
                          : applicationsOf(row);
                      return text ? (
                        <p
                          className="truncate text-xs font-medium text-muted-foreground"
                          title={text}
                        >
                          {text}
                        </p>
                      ) : (
                        <Dash />
                      );
                    })()}
                </td>

                <td className="overflow-hidden px-4 py-4">
                  {row.created_at ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatAddedOn(row.created_at)}
                    </span>
                  ) : (
                    <Dash />
                  )}
                </td>

                {showVariants && (
                  <td className="overflow-hidden px-4 py-4">
                    <VariantCountBadge
                      count={row.variant_count}
                      expanded={isExpanded}
                      onClick={
                        hasVariants ? () => onToggleExpanded(row.id) : undefined
                      }
                    />
                  </td>
                )}

                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconAction
                      label={`View ${row.name_en}`}
                      onClick={() => onInspect(row)}
                    >
                      <Eye className="size-4" strokeWidth={2.25} />
                    </IconAction>
                    <ShortlistMenu
                      productId={row.id}
                      companyId={null}
                      productName={row.name_en}
                      memberships={
                        membershipsByRow.get(shortlistKey(row.id, null)) ?? []
                      }
                      variant="icon"
                    />
                    <RowMenu row={row} onEdit={onEdit} />
                  </div>
                </td>
                </tr>
                {isExpanded && (
                  <VariantTableRows
                    parentId={row.id}
                    colSpan={columnCount}
                    onInspect={onInspect}
                    onCollapse={() => onToggleExpanded(row.id)}
                  />
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card view                                                                  */
/* -------------------------------------------------------------------------- */

function ProductCardView({
  rows,
  mode,
  selected,
  onToggleRow,
  membershipsByRow,
  onInspect,
  onEdit,
  expanded,
  onToggleExpanded,
}: RowProps) {
  const showCas = mode !== "packaging";
  const showVariants = mode !== "chemical";

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
      {rows.map((row) => {
        const category = primaryCategory(row.material_type, row.is_packaging);
        const Icon = category.icon;
        const isSelected = selected.has(row.id);
        const hasVariants = showVariants && row.variant_count > 0;
        const isExpanded = hasVariants && expanded.has(row.id);

        return (
          <div
            key={row.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              isSelected
                ? "border-primary/40 bg-primary/[0.04] shadow-sm"
                : "border-border/60 bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onChange={() => onToggleRow(row.id)}
                aria-label={`Select ${row.name_en}`}
                className="mt-1"
              />
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                  category.tile,
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onInspect(row)}
                  className="block w-full truncate text-left text-sm font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  title={row.name_en}
                >
                  {row.name_en}
                </button>
                {hasVariants ? (
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(row.id)}
                    aria-expanded={isExpanded}
                    className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5" strokeWidth={2.5} />
                    ) : (
                      <ChevronRight className="size-3.5" strokeWidth={2.5} />
                    )}
                    {row.variant_count} variant{row.variant_count === 1 ? "" : "s"}
                  </button>
                ) : (
                  subtitleOf(row) && (
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {subtitleOf(row)}
                    </p>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryCell row={row} />
            </div>

            <dl className="space-y-1.5 text-xs">
              {showCas ? (
                <CardRow label="CAS">
                  {row.cas_number ? (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      {row.cas_number}
                      {row.cas_is_verified && (
                        <BadgeCheck
                          className="size-3.5 text-success"
                          aria-label="Checksum verified"
                        />
                      )}
                    </span>
                  ) : (
                    <Dash />
                  )}
                </CardRow>
              ) : (
                <CardRow label="Supplier">
                  <SupplierCell row={row} />
                </CardRow>
              )}
              <CardRow label="Country">
                <CountryCell row={row} />
              </CardRow>
              <CardRow label="Suppliers">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Building2 className="size-3.5 text-muted-foreground" strokeWidth={2} />
                  {row.facets?.supplier_count ?? 0}
                </span>
              </CardRow>
              <CardRow label="Added">
                {row.created_at ? formatAddedOn(row.created_at) : <Dash />}
              </CardRow>
            </dl>

            {isExpanded && (
              <VariantCardList parentId={row.id} onInspect={onInspect} />
            )}

            <div className="mt-auto flex items-center justify-end gap-0.5 border-t border-border/50 pt-2.5">
              <IconAction label={`View ${row.name_en}`} onClick={() => onInspect(row)}>
                <Eye className="size-4" strokeWidth={2.25} />
              </IconAction>
              <ShortlistMenu
                productId={row.id}
                companyId={null}
                productName={row.name_en}
                memberships={membershipsByRow.get(shortlistKey(row.id, null)) ?? []}
                variant="icon"
              />
              <RowMenu row={row} onEdit={onEdit} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Variant breakdown                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Sizes/colours (or salts, hydrates…) hanging off one family row, fetched only
 * once its row is expanded — the catalogue page doesn't ship every variant of
 * every product up front. Shared params/query between the table and card
 * views; the two below just render the result differently.
 */
function useVariants(parentId: number) {
  return useProducts({
    parent_product_id: parentId,
    sort: "name_en",
    order: "asc",
    size: 50,
  });
}

/** Rows beyond this collapse behind "Show more" — a family can carry 60+
 *  variants, and dumping all of them inline defeats the point of grouping. */
const VARIANTS_PREVIEW_COUNT = 6;

/** Numerics arrive as strings like "40.0000" — trailing zeros are storage
 *  precision, not something a buyer wants to read. */
function trimNum(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}

/** The one populated dimension field for this spec — a stopper has a size,
 *  a film has a thickness, a bottle has a volume; never more than one. */
function dimensionOf(spec: PackagingSpec | null | undefined): string | null {
  if (!spec) return null;
  if (spec.size_mm) return `${trimNum(spec.size_mm)} mm`;
  if (spec.thickness_mm) return `${trimNum(spec.thickness_mm)} mm`;
  if (spec.width_mm) return `${trimNum(spec.width_mm)} mm`;
  if (spec.volume_ml) return `${trimNum(spec.volume_ml)} ml`;
  if (spec.unit_weight_g) return `${trimNum(spec.unit_weight_g)} g`;
  return null;
}

/** Whatever else the spec carries — subtype, material, coating, standard —
 *  besides size/colour, which already get their own columns. Reuses the same
 *  field list the details dialog shows in full. */
function specSummary(spec: PackagingSpec | null | undefined): string | null {
  if (!spec) return null;
  const ownColumn = new Set([
    // "Type" is the packaging family itself — already implied by which
    // family row this variant is nested under, so repeating it here is noise.
    "Type",
    "Size",
    "Thickness",
    "Width",
    "Volume",
    "Unit weight",
    "Colour",
  ]);
  const parts = specEntries(spec)
    .filter(([label]) => !ownColumn.has(label))
    .map(([, value]) => value);
  return parts.length ? parts.join(" · ") : null;
}

/** "USD 12–15 / kg" — a range only when suppliers disagree, a unit only when
 *  one is on record. Sourced from the cheapest-offer rollup in ProductFacets
 *  (see services/product.py facets_for); never mixes per-kg and per-piece
 *  prices into one range. */
function priceCell(facets: ProductFacets | undefined): string | null {
  if (!facets?.price_min) return null;
  const money = facets.price_currency ? `${facets.price_currency} ` : "";
  const amount = facets.price_max
    ? `${money}${trimNum(facets.price_min)}–${trimNum(facets.price_max)}`
    : `${money}${trimNum(facets.price_min)}`;
  return facets.price_unit ? `${amount} / ${facets.price_unit}` : amount;
}

function moqCell(facets: ProductFacets | undefined): string | null {
  if (!facets?.price_moq) return null;
  const unit = facets.price_moq_unit ? ` ${facets.price_moq_unit}` : "";
  return `${trimNum(facets.price_moq)}${unit}`;
}

/** Known colour words get a matching swatch dot; anything else (a supplier's
 *  own wording, e.g. "custom") still reads fine as plain text. */
const COLOUR_SWATCHES: Record<string, string> = {
  grey: "#9ca3af",
  gray: "#9ca3af",
  blue: "#3b82f6",
  dark_red: "#7f1d1d",
  red: "#dc2626",
  golden: "#d4af37",
  gold: "#d4af37",
  silver: "#c0c0c0",
  white: "#f8fafc",
  natural: "#e7e5e4",
  clear: "transparent",
  transparent: "transparent",
  green: "#16a34a",
  amber: "#f59e0b",
  coffee: "#6f4518",
  black: "#111827",
};

/** Stored colours are snake_case ("dark_red") — this is the only place that
 *  reads. */
function colourLabel(colour: string): string {
  return colour.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function ColourSwatch({ colour }: { colour: string | null | undefined }) {
  if (!colour) return <Dash />;
  const hex = COLOUR_SWATCHES[colour.trim().toLowerCase()];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-full border border-border/60"
        style={{ backgroundColor: hex ?? "transparent" }}
      />
      <span className="truncate">{colourLabel(colour)}</span>
    </span>
  );
}

/** "Show N more" toggle shared by both variant lists — collapsed to a preview
 *  by default so a 60-variant family doesn't dump every row at once. */
function useVariantPreview(variants: ProductListItem[]) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? variants : variants.slice(0, VARIANTS_PREVIEW_COUNT);
  const hasMore = variants.length > VARIANTS_PREVIEW_COUNT;
  return { visible, hasMore, showAll, setShowAll };
}

function VariantTableRows({
  parentId,
  colSpan,
  onInspect,
  onCollapse,
}: {
  parentId: number;
  colSpan: number;
  onInspect: (product: ProductListItem) => void;
  onCollapse: () => void;
}) {
  const { data, isLoading } = useVariants(parentId);
  const variants = data?.items ?? [];
  const { visible, hasMore, showAll, setShowAll } = useVariantPreview(variants);

  return (
    <tr className="border-b border-border/40 bg-secondary/20 last:border-0">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="pl-9">
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">
                Variants{!isLoading && ` (${variants.length})`}
              </p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                Different configurations/specifications available for this
                product
              </p>
            </div>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse variants"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ChevronUp className="size-4" strokeWidth={2.5} />
            </button>
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
              Loading variants…
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/50 bg-card">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <VariantHeaderCell>Variant Name</VariantHeaderCell>
                    <VariantHeaderCell>Specification</VariantHeaderCell>
                    <VariantHeaderCell>Color</VariantHeaderCell>
                    <VariantHeaderCell>Size/Dimension</VariantHeaderCell>
                    <VariantHeaderCell>MOQ</VariantHeaderCell>
                    <VariantHeaderCell>Price</VariantHeaderCell>
                    <VariantHeaderCell>Suppliers</VariantHeaderCell>
                    <VariantHeaderCell className="text-right">
                      Actions
                    </VariantHeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((variant) => {
                    const spec = variant.packaging_spec;
                    return (
                      <tr
                        key={variant.id}
                        className="border-b border-border/30 last:border-0 hover:bg-accent/40"
                      >
                        <td className="max-w-[220px] truncate px-3 py-2">
                          <button
                            type="button"
                            onClick={() => onInspect(variant)}
                            className="truncate text-left font-semibold text-foreground hover:text-primary focus-visible:outline-none"
                            title={variant.name_en}
                          >
                            {variant.name_en}
                          </button>
                        </td>
                        <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                          {specSummary(spec) ?? <Dash />}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <ColourSwatch colour={spec?.colour} />
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {dimensionOf(spec) ?? <Dash />}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {moqCell(variant.facets) ?? <Dash />}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {priceCell(variant.facets) ?? <Dash />}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="size-3 shrink-0" strokeWidth={2} />
                            {variant.facets?.supplier_count ?? 0}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <IconAction
                            label={`View ${variant.name_en}`}
                            onClick={() => onInspect(variant)}
                          >
                            <Eye className="size-3.5" strokeWidth={2.25} />
                          </IconAction>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setShowAll((prev) => !prev)}
                  className="flex w-full items-center justify-center gap-1 border-t border-border/50 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:outline-none"
                >
                  {showAll
                    ? "Show fewer variants"
                    : `Show ${variants.length - VARIANTS_PREVIEW_COUNT} more variants`}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      showAll && "rotate-180",
                    )}
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function VariantHeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 text-left text-xs font-bold text-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

function VariantCardList({
  parentId,
  onInspect,
}: {
  parentId: number;
  onInspect: (product: ProductListItem) => void;
}) {
  const { data, isLoading } = useVariants(parentId);
  const variants = data?.items ?? [];
  const { visible, hasMore, showAll, setShowAll } = useVariantPreview(variants);

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-2">
      {isLoading ? (
        <p className="flex items-center gap-2 px-1.5 py-1 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
          Loading variants…
        </p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {visible.map((variant) => {
              const spec = variant.packaging_spec;
              const dimension = dimensionOf(spec);
              const price = priceCell(variant.facets);
              const moq = moqCell(variant.facets);

              return (
                <li key={variant.id} className="rounded-md px-1.5 py-1 hover:bg-accent/60">
                  <button
                    type="button"
                    onClick={() => onInspect(variant)}
                    className="block w-full truncate text-left text-xs font-semibold text-foreground hover:text-primary focus-visible:outline-none"
                    title={variant.name_en}
                  >
                    {variant.name_en}
                  </button>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
                    {spec?.colour && <ColourSwatch colour={spec.colour} />}
                    {dimension && <span>{dimension}</span>}
                    {price && (
                      <span className="font-semibold text-foreground/80">
                        {price}
                      </span>
                    )}
                    {moq && <span>MOQ {moq}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-3 shrink-0" strokeWidth={2} />
                      {variant.facets?.supplier_count ?? 0}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none"
            >
              {showAll
                ? "Show fewer variants"
                : `Show ${variants.length - VARIANTS_PREVIEW_COUNT} more`}
              <ChevronDown
                className={cn("size-3 transition-transform", showAll && "rotate-180")}
                strokeWidth={2.5}
              />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** The main table's "Variants" column — a plain dash for a leaf/variant row,
 *  a clickable count pill for a family heading (doubles as the expand
 *  control, alongside the chevron in the name cell). */
function VariantCountBadge({
  count,
  expanded,
  onClick,
}: {
  count: number;
  expanded: boolean;
  onClick?: () => void;
}) {
  if (count === 0) return <Dash />;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        expanded
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-success/25 bg-success/10 text-success hover:bg-success/15",
      )}
    >
      {count}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared cells and chrome                                                    */
/* -------------------------------------------------------------------------- */

/** The category a row leads with — the catalogue's own `material_type`, not
 *  a rollup across offers (see product-taxonomy.ts primaryCategory). What
 *  suppliers individually offer this *as* lives in the details view only. */
function CategoryCell({ row }: { row: ProductListItem }) {
  const category = primaryCategory(row.material_type, row.is_packaging);
  return (
    <Badge
      className={cn(
        "whitespace-nowrap border-transparent px-2.5 py-0.5 text-[11px]",
        category.badge,
      )}
    >
      {category.label}
    </Badge>
  );
}

function CountryCell({ row }: { row: ProductListItem }) {
  // Defensive check for missing facets
  if (!row.facets || !row.facets.countries) {
    return <Dash />;
  }

  const [first, ...rest] = row.facets.countries;
  if (!first) return <Dash />;

  const flag = flagEmoji(first.iso2);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      {flag && (
        <span aria-hidden className="text-base leading-none">
          {flag}
        </span>
      )}
      {first.name}
      {rest.length > 0 && (
        <span
          className="font-semibold text-muted-foreground"
          title={rest.map((country) => country.name).join(", ")}
        >
          +{rest.length}
        </span>
      )}
    </span>
  );
}

/** The packaging view's stand-in for CAS/Applications, neither of which means
 *  anything for a packaging item — the first supplier's name, with a "show
 *  more" toggle for the rest rather than a static "+N" badge (a buyer wants
 *  to actually read the other names, not just know a count). */
function SupplierCell({ row }: { row: ProductListItem }) {
  const [expanded, setExpanded] = useState(false);
  const suppliers = row.facets?.suppliers ?? [];
  if (suppliers.length === 0) return <Dash />;
  const [first, ...rest] = suppliers;

  if (expanded) {
    return (
      <div className="min-w-0 text-xs font-medium text-foreground">
        <ul className="space-y-0.5">
          {suppliers.map((name) => (
            <li key={name} className="truncate" title={name}>
              {name}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-0.5 font-semibold text-primary hover:underline focus-visible:outline-none"
        >
          Show less
        </button>
      </div>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="truncate" title={first}>
        {first}
      </span>
      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 font-semibold text-primary hover:underline focus-visible:outline-none"
        >
          +{rest.length} more
        </button>
      )}
    </span>
  );
}

function RowMenu({
  row,
  onEdit,
}: {
  row: ProductListItem;
  onEdit: (product: ProductListItem) => void;
}) {
  const deleteProduct = useDeleteProduct();

  return (
    <DropdownMenu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`More actions for ${row.name_en}`}
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
              navigator.clipboard?.writeText(row.cas_number ?? row.name_en);
              close();
            }}
          >
            <Copy />
            Copy {row.cas_number ? "CAS number" : "name"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Link
            href={`/search?q=${encodeURIComponent(row.cas_number ?? row.name_en)}`}
            role="menuitem"
            onClick={close}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/70 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
          >
            <SearchIcon />
            Find suppliers
          </Link>
          <Link
            href={`/offers?product_id=${row.id}`}
            role="menuitem"
            onClick={close}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/70 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
          >
            <Building2 />
            View offers
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              close();
              onEdit(row);
            }}
          >
            <Pencil />
            Edit product
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onClick={() => {
              if (
                !window.confirm(
                  `Delete "${row.name_en}"? This cannot be undone.`,
                )
              )
                return;
              close();
              deleteProduct.mutate(row.id, {
                onSuccess: () =>
                  toast.success(`Deleted ${row.name_en}`, { duration: 6000 }),
                onError: (cause) =>
                  toast.error(
                    cause instanceof Error
                      ? cause.message
                      : "Could not delete the product",
                    { duration: 6000 },
                  ),
              });
            }}
          >
            <Trash2 />
            Delete product
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

function BulkBar({
  count,
  onClear,
  onExport,
  exporting,
  onDelete,
  deleting,
}: {
  count: number;
  onClear: () => void;
  onExport: () => void;
  exporting: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 bg-primary/[0.06] px-5 py-3">
      <p className="text-sm font-semibold text-foreground">
        <span className="tabular-nums">{count}</span> product
        {count === 1 ? "" : "s"} selected
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={exporting || deleting}
          className="h-8"
        >
          {exporting ? (
            <Loader2 className="animate-spin" strokeWidth={2.25} />
          ) : (
            <Download strokeWidth={2.25} />
          )}
          Export selected
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={exporting || deleting}
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
          className="h-8"
        >
          <X strokeWidth={2.25} />
          Clear
        </Button>
      </div>
    </div>
  );
}

function HeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3.5 text-left text-xs font-bold text-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {children}
    </button>
  );
}

function CardRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-foreground">{children}</dd>
    </div>
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

function Dash() {
  return <span className="text-xs font-medium text-muted-foreground/60">—</span>;
}

/** The grey second line under a product name. Falls back through what the
 *  record actually carries, so a row without a Chinese name still says
 *  something useful instead of leaving a gap. */
function subtitleOf(row: ProductListItem): string | null {
  return row.name_cn || row.variant || row.therapeutic_classes[0] || null;
}

function applicationsOf(row: ProductListItem): string | null {
  if (row.facets?.applications && row.facets.applications.length > 0) {
    return row.facets.applications.map(applicationLabel).join(", ");
  }
  return row.indication_text || row.therapeutic_classes?.join(", ") || null;
}

function therapeuticClassesOf(row: ProductListItem): string | null {
  return row.therapeutic_classes?.length ? row.therapeutic_classes.join(", ") : null;
}

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

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
          Could not load the catalogue
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
        Loading products…
      </span>
    </div>
  );
}

/** "Nothing matched your filters" is recoverable and needs a way out; "the
 *  catalogue is empty" is a different situation and gets a different message. */
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
          {filtered ? "No products match these filters" : "No products yet"}
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {filtered
            ? "A CAS number finds the exact substance; a partial name is typo-tolerant."
            : "Import a supplier list or add a product to get started."}
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
