"use client";

import { useState } from "react";
import { Search, Star } from "lucide-react";
import { useOffers } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { OfferListItem } from "@/types/api";

const PAGE_SIZE = 25;

/** "packaging_material" → "Packaging material". */
function humanise(value: string | null): string {
  if (!value) return "—";
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function OffersTable() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounced(query);

  const { data, isFetching, error } = useOffers({
    q: debouncedQuery || undefined,
    page,
    size: PAGE_SIZE,
  });

  const columns: Column<OfferListItem>[] = [
    {
      header: "Product",
      cell: (row) => (
        <div className="flex items-start gap-2">
          {row.is_watchlisted && (
            <Star
              className="mt-0.5 size-3.5 shrink-0 fill-warning text-warning"
              aria-label="Watchlisted"
            />
          )}
          <div className="min-w-0">
            <p className="font-medium">{row.product?.name_en ?? "—"}</p>
            {row.product?.cas_number && (
              <p className="font-mono text-xs text-muted-foreground">
                {row.product.cas_number}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Supplier",
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.company?.name_en ?? "—"}
        </span>
      ),
    },
    {
      header: "Material type",
      cell: (row) =>
        row.material_type ? (
          <Badge variant="secondary">{humanise(row.material_type)}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Unmapped</span>
        ),
      className: "hidden md:table-cell",
    },
    {
      header: "Status",
      cell: (row) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {humanise(row.commercial_status)}
        </span>
      ),
      className: "hidden lg:table-cell",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search offers…"
          className="pl-9"
          aria-label="Search offers"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        isLoading={isFetching}
        error={error}
        getRowKey={(row) => row.id}
        emptyTitle="No offers match"
        emptyDescription="An offer links a supplier to a product, with its spec, packing, and qualification."
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
    </div>
  );
}
