"use client";

import { useState } from "react";
import {
  AlertCircle,
  Copy,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteEntity, useOffers } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import {
  GREEN_BUTTON,
  IconButton,
  OUTLINE_BUTTON,
  SectionCard,
} from "@/components/companies/detail/section-card";
import { CataloguePagination } from "@/components/companies/detail/catalogue-pagination";
import {
  CatalogueFilter,
  EMPTY_CATALOGUE_FILTERS,
  activeFilterCount,
  type CatalogueFilters,
} from "@/components/companies/detail/catalogue-filter";
import { OfferDetailsDialog } from "@/components/companies/detail/offer-details-dialog";
import { ProductFormDialog } from "@/components/companies/product-form-dialog";
import type { OfferListItem } from "@/types/api";

/** Five rows a page, as the profile is laid out: the catalogue is one card on
 *  a page of five, not the products screen. Paging is one click away and the
 *  full list is on /products. */
const PAGE_SIZE = 5;

/** A muted, italic "N/A" — the fallback used consistently across Search too,
 *  so a missing value never reads as a blank cell (2026-08-11 decision). */
function NotAvailable() {
  return <span className="text-xs italic text-muted-foreground/60">N/A</span>;
}

const COLUMNS = [
  { label: "#", className: "w-10" },
  { label: "Product", className: "" },
  { label: "CAS", className: "" },
  { label: "Specification", className: "hidden sm:table-cell" },
  { label: "Indication / Use", className: "hidden md:table-cell" },
  { label: "Therapeutic Class", className: "hidden lg:table-cell" },
  { label: "Qualification", className: "hidden xl:table-cell" },
  { label: "Packing", className: "hidden xl:table-cell" },
  { label: "Actions", className: "w-px" },
];

/**
 * What this company actually offers.
 *
 * Reuses the enriched `/offers` endpoint (product name/CAS, this supplier's
 * own spec, the product's indication and therapeutic class) so the card needs
 * one paginated call, not a round-trip per product. Search and the filter
 * facets narrow server-side for the same reason the footer count has to stay
 * honest.
 */
export function CompanyCatalogue({
  companyId,
  onAddProduct,
}: {
  companyId: number;
  onAddProduct: () => void;
}) {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [filters, setFilters] = useState<CatalogueFilters>(EMPTY_CATALOGUE_FILTERS);
  const [viewing, setViewing] = useState<OfferListItem | null>(null);
  const [editing, setEditing] = useState<OfferListItem | null>(null);
  const search = useDebounced(draft.trim());

  // Narrowing changes what page 1 even means, so every control that narrows
  // rewinds the pager with it — otherwise a stale page number lands the reader
  // on an empty page of a shorter result set.
  function narrow(apply: () => void) {
    apply();
    setPage(1);
  }

  const { data, isPending, isFetching, error } = useOffers({
    company_id: companyId,
    page,
    size: PAGE_SIZE,
    ...(search ? { q: search } : {}),
    ...(filters.materialType ? { material_type: filters.materialType } : {}),
    ...(filters.marketSegment ? { market_segment: filters.marketSegment } : {}),
    ...(filters.sterileOnly ? { is_sterile: true } : {}),
  });

  const rows = data?.items ?? [];
  const narrowed = Boolean(search) || activeFilterCount(filters) > 0;

  return (
    <>
      <SectionCard
        icon={Package}
        title="Product Catalogue"
        caption="Complete list of products with specifications"
        actions={
          <>
            <div className="relative w-full sm:w-[230px]">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={draft}
                onChange={(event) =>
                  narrow(() => setDraft(event.target.value))
                }
                placeholder="Search products..."
                aria-label="Search this company's products"
                className="h-10 rounded-xl pl-10 text-sm font-normal"
              />
            </div>
            <CatalogueFilter
              filters={filters}
              onChange={(next) => narrow(() => setFilters(next))}
            />
            <button type="button" onClick={onAddProduct} className={GREEN_BUTTON}>
              <Plus strokeWidth={2.4} />
              Add Product
            </button>
          </>
        }
      >
        {error ? (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-12 text-sm font-semibold text-destructive"
          >
            <AlertCircle className="size-4" />
            {error instanceof Error ? error.message : "This catalogue could not be loaded."}
          </div>
        ) : isPending ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-4 py-14 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading products…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Package className="size-6" strokeWidth={2} />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {narrowed ? "Nothing matches that here" : "No products on file for this company"}
              </p>
              <p className="max-w-md text-xs font-medium text-muted-foreground">
                {narrowed
                  ? "Clear the search or the filters to see the whole catalogue."
                  : "Offers link a supplier to a product with its spec, indication, and therapeutic class."}
              </p>
            </div>
            {narrowed ? null : (
              <button type="button" onClick={onAddProduct} className={GREEN_BUTTON}>
                <Plus strokeWidth={2.4} />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl border border-border/60">
              {isFetching ? (
                <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-lg bg-background/85 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur">
                  <Loader2 className="size-3 animate-spin" />
                  Updating…
                </span>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-secondary/50">
                      {COLUMNS.map((column) => (
                        <th
                          key={column.label}
                          scope="col"
                          className={cn(
                            "whitespace-nowrap px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
                            column.className,
                          )}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={cn(
                      "divide-y divide-border/50",
                      isFetching && "opacity-60 transition-opacity",
                    )}
                  >
                    {rows.map((offer, index) => (
                      <CatalogueRow
                        key={offer.id}
                        offer={offer}
                        index={(page - 1) * PAGE_SIZE + index + 1}
                        onView={() => setViewing(offer)}
                        onEdit={() => setEditing(offer)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {data ? (
              <CataloguePagination
                page={data.page}
                pageCount={data.pages}
                total={data.total}
                pageSize={data.size}
                itemLabel={data.total === 1 ? "product" : "products"}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </SectionCard>

      <OfferDetailsDialog
        offer={viewing}
        open={viewing !== null}
        onClose={() => setViewing(null)}
        onEdit={() => setEditing(viewing)}
      />

      <ProductFormDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        companyId={companyId}
        offer={editing}
      />
    </>
  );
}

function CatalogueRow({
  offer,
  index,
  onView,
  onEdit,
}: {
  offer: OfferListItem;
  index: number;
  onView: () => void;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const deleteOffer = useDeleteEntity("offers");

  return (
    <tr className="bg-card transition-colors hover:bg-success/[0.04]">
      <td className="px-3 py-3.5 text-[13px] font-medium tabular-nums text-muted-foreground">
        {index}
      </td>
      <td className="px-3 py-3.5">
        <span className="font-semibold text-foreground">
          {offer.product?.name_en ?? "—"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3.5">
        {offer.product?.cas_number ? (
          <span className="font-mono text-xs tabular-nums text-foreground">
            {offer.product.cas_number}
          </span>
        ) : (
          <NotAvailable />
        )}
      </td>
      <td className="hidden px-3 py-3.5 text-[13px] text-muted-foreground sm:table-cell">
        {offer.spec_text || <NotAvailable />}
      </td>
      <td className="hidden px-3 py-3.5 text-[13px] text-muted-foreground md:table-cell">
        {offer.product?.indication_text || <NotAvailable />}
      </td>
      <td className="hidden px-3 py-3.5 lg:table-cell">
        {offer.product && offer.product.therapeutic_classes.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {offer.product.therapeutic_classes.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success ring-1 ring-inset ring-success/15"
              >
                {name}
              </span>
            ))}
          </span>
        ) : (
          <NotAvailable />
        )}
      </td>
      <td className="hidden px-3 py-3.5 text-[13px] text-muted-foreground xl:table-cell">
        {offer.qualification_text || <NotAvailable />}
      </td>
      <td className="hidden px-3 py-3.5 text-[13px] text-muted-foreground xl:table-cell">
        {offer.packing_text || <NotAvailable />}
      </td>
      <td className="px-3 py-3.5">
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={onView}
            className={cn(OUTLINE_BUTTON, "h-9 px-3.5 text-[13px]")}
          >
            <Eye strokeWidth={2.2} />
            View
          </button>

          <DropdownMenu
            trigger={(props) => (
              <IconButton
                aria-label={`Actions for ${offer.product?.name_en ?? "this product"}`}
                {...props}
              >
                <MoreHorizontal strokeWidth={2.2} />
              </IconButton>
            )}
          >
            {(close) => (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    onView();
                  }}
                >
                  <Eye />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    onEdit();
                  }}
                >
                  <Pencil />
                  Edit product
                </DropdownMenuItem>
                {offer.product?.cas_number ? (
                  <DropdownMenuItem
                    onClick={async () => {
                      close();
                      try {
                        await navigator.clipboard.writeText(offer.product!.cas_number!);
                        toast.success("CAS number copied");
                      } catch {
                        toast.error("Could not copy the CAS number.");
                      }
                    }}
                  >
                    <Copy />
                    Copy CAS number
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onClick={() => {
                    close();
                    setConfirming(true);
                  }}
                >
                  <Trash2 />
                  Remove from catalogue
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </td>

      {confirming ? (
        <ConfirmDialog
          title="Remove this product?"
          description={
            <>
              <span className="font-semibold text-foreground">
                {offer.product?.name_en ?? "This product"}
              </span>{" "}
              will be removed from this supplier&apos;s catalogue. The product
              itself stays in the database.
            </>
          }
          confirmLabel="Remove"
          busy={deleteOffer.isPending}
          onConfirm={() =>
            deleteOffer.mutate(offer.id, {
              onError: () => toast.error("Could not remove this product."),
              onSettled: () => setConfirming(false),
            })
          }
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </tr>
  );
}
