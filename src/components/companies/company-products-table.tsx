"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useOffers } from "@/lib/queries";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "@/components/companies/product-form-dialog";
import type { OfferListItem } from "@/types/api";

const PAGE_SIZE = 20;

/** A muted, italic "N/A" — the fallback used consistently across Search too,
 *  so a missing value never reads as a blank cell (2026-08-11 decision). */
function NotAvailable() {
  return <span className="text-xs italic text-muted-foreground/60">N/A</span>;
}

/**
 * What one company actually offers: reuses the enriched /offers endpoint
 * (product name/CAS, this supplier's own spec, the product's indication and
 * therapeutic class) so the company detail page needs one paginated call, not
 * a separate round-trip per product.
 */
export function CompanyProductsTable({ companyId }: { companyId: number }) {
  const [page, setPage] = useState(1);
  const [editingOffer, setEditingOffer] = useState<OfferListItem | null>(null);
  const { data, isFetching, error } = useOffers({
    company_id: companyId,
    page,
    size: PAGE_SIZE,
  });

  const columns: Column<OfferListItem>[] = [
    {
      header: "Product",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.product?.name_en ?? "—"}</p>
        </div>
      ),
    },
    {
      header: "CAS",
      cell: (row) =>
        row.product?.cas_number ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs tabular-nums">
            {row.product.cas_number}
          </span>
        ) : (
          <NotAvailable />
        ),
    },
    {
      header: "Specification",
      cell: (row) =>
        row.spec_text ? (
          <span className="text-muted-foreground">{row.spec_text}</span>
        ) : (
          <NotAvailable />
        ),
      className: "hidden sm:table-cell",
    },
    {
      header: "Indication / Use",
      cell: (row) =>
        row.product?.indication_text ? (
          <span className="text-muted-foreground">
            {row.product.indication_text}
          </span>
        ) : (
          <NotAvailable />
        ),
      className: "hidden md:table-cell",
    },
    {
      header: "Therapeutic Class",
      cell: (row) =>
        row.product && row.product.therapeutic_classes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.product.therapeutic_classes.map((name) => (
              <Badge key={name} variant="secondary" className="text-[11px]">
                {name}
              </Badge>
            ))}
          </div>
        ) : (
          <NotAvailable />
        ),
      className: "hidden lg:table-cell",
    },
    {
      header: "Qualification / Approval",
      cell: (row) =>
        row.qualification_text ? (
          <span className="text-muted-foreground">{row.qualification_text}</span>
        ) : (
          <NotAvailable />
        ),
      className: "hidden xl:table-cell",
    },
    {
      header: "Packing / Details",
      cell: (row) =>
        row.packing_text ? (
          <span className="text-muted-foreground">{row.packing_text}</span>
        ) : (
          <NotAvailable />
        ),
      className: "hidden xl:table-cell",
    },
    {
      header: "Edit",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => setEditingOffer(row)}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        rows={data?.items}
        isLoading={isFetching}
        error={error}
        getRowKey={(row) => row.id}
        emptyTitle="No products on file for this company"
        emptyDescription="Offers link a supplier to a product with its spec, indication, and therapeutic class."
      />

      {data && (
        <Pagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          size={data.size}
          onPageChange={setPage}
        />
      )}

      <ProductFormDialog
        open={editingOffer !== null}
        onClose={() => setEditingOffer(null)}
        companyId={companyId}
        offer={editingOffer}
      />
    </div>
  );
}
