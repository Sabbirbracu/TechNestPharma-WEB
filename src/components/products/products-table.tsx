"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  Building2,
  ChevronsUpDown,
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
} from "./product-details-dialog";
import { ProductFormDialog } from "./product-form-dialog";
import {
  downloadCsv,
  exportFilename,
  fetchAllProducts,
  productsToCsv,
} from "./product-export";
import {
  CATEGORY_STYLES,
  applicationLabel,
  flagEmoji,
  primaryCategory,
} from "./product-taxonomy";
import type { ProductListItem, ProductListParams } from "@/types/api";

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

export function ProductsTable() {
  const [filters, setFilters] = useState<ProductFilterValues>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortValue>("name_en:asc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [inspecting, setInspecting] = useState<ProductListItem | null>(null);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteProduct = useDeleteProduct();

  const [sortField, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

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
              />
            ) : (
              <ProductCardView
                rows={rows}
                selected={selected}
                onToggleRow={toggleRow}
                membershipsByRow={membershipsByRow}
                onInspect={setInspecting}
                onEdit={setEditing}
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
  selected: Set<number>;
  onToggleRow: (id: number) => void;
  membershipsByRow: ReturnType<typeof groupMemberships>;
  onInspect: (product: ProductListItem) => void;
  onEdit: (product: ProductListItem) => void;
};

function ProductTableView({
  rows,
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
}: RowProps & {
  sort: SortValue;
  onSortChange: (sort: SortValue) => void;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  onToggleAll: () => void;
}) {
  const nameSorted = sort.startsWith("name_en");

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
          <col className="w-32" />
          <col className="w-[118px]" />
          <col className="w-32" />
          <col className="w-[112px]" />
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
            <HeaderCell>CAS No.</HeaderCell>
            <HeaderCell>Country</HeaderCell>
            <HeaderCell>Applications</HeaderCell>
            <HeaderCell>Added On</HeaderCell>
            <HeaderCell className="text-right">Actions</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            // Defensive check for missing facets data
            if (!row.facets) {
              console.warn("Product row missing facets:", row);
              return null;
            }

            const category = primaryCategory(
              row.facets.material_types,
              row.is_packaging,
            );
            const Icon = category.icon;
            const isSelected = selected.has(row.id);

            return (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border/40 transition-colors last:border-0",
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
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                        category.tile,
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={2} />
                    </span>
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

                <td className="overflow-hidden px-4 py-4">
                  <CountryCell row={row} />
                </td>

                <td className="overflow-hidden px-4 py-4">
                  {applicationsOf(row) ? (
                    <p
                      className="truncate text-xs font-medium text-muted-foreground"
                      title={applicationsOf(row) ?? undefined}
                    >
                      {applicationsOf(row)}
                    </p>
                  ) : (
                    <Dash />
                  )}
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
  selected,
  onToggleRow,
  membershipsByRow,
  onInspect,
  onEdit,
}: RowProps) {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
      {rows.map((row) => {
        // Defensive check for missing facets data
        if (!row.facets) {
          console.warn("Product row missing facets:", row);
          return null;
        }

        const category = primaryCategory(
          row.facets.material_types,
          row.is_packaging,
        );
        const Icon = category.icon;
        const isSelected = selected.has(row.id);

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
                {subtitleOf(row) && (
                  <p className="truncate text-xs font-medium text-muted-foreground">
                    {subtitleOf(row)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <CategoryCell row={row} />
            </div>

            <dl className="space-y-1.5 text-xs">
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
/* Shared cells and chrome                                                    */
/* -------------------------------------------------------------------------- */

/** The category a row leads with, plus a count when suppliers disagree — the
 *  same substance really is an API to one and an excipient to another (D14). */
function CategoryCell({ row }: { row: ProductListItem }) {
  // Defensive check for missing facets
  if (!row.facets || !row.facets.material_types) {
    return <Dash />;
  }

  const category = primaryCategory(
    row.facets.material_types,
    row.is_packaging,
  );
  const extra = Math.max(0, row.facets.material_types.length - 1);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge
        className={cn(
          "whitespace-nowrap border-transparent px-2.5 py-0.5 text-[11px]",
          category.badge,
        )}
      >
        {category.label}
      </Badge>
      {extra > 0 && (
        <span
          className="text-[11px] font-semibold text-muted-foreground"
          title={row.facets.material_types
            .slice(1)
            .map((type) => CATEGORY_STYLES[type]?.label ?? type)
            .join(", ")}
        >
          +{extra}
        </span>
      )}
    </span>
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
