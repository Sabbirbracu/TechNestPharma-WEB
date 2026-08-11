"use client";

import { useState } from "react";
import { Search, BadgeCheck } from "lucide-react";
import { useProducts } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import type { ProductListItem } from "@/types/api";

const PAGE_SIZE = 25;

export function ProductsTable() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounced(query);

  const { data, isFetching, error } = useProducts({
    q: debouncedQuery || undefined,
    page,
    size: PAGE_SIZE,
  });

  const columns: Column<ProductListItem>[] = [
    {
      header: "Product",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium">{row.name_en}</p>
          {row.name_cn && (
            <p className="text-xs text-muted-foreground">{row.name_cn}</p>
          )}
        </div>
      ),
    },
    {
      header: "Variant",
      cell: (row) => (
        <span className="text-muted-foreground">{row.variant ?? "—"}</span>
      ),
      className: "hidden md:table-cell",
    },
    {
      header: "CAS",
      cell: (row) =>
        row.cas_number ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs tabular-nums">
            {row.cas_number}
            {row.cas_is_verified && (
              <BadgeCheck
                className="size-3.5 text-success"
                aria-label="Checksum verified"
              />
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
          placeholder="Search by name or CAS number…"
          className="pl-9"
          aria-label="Search products"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        isLoading={isFetching}
        error={error}
        getRowKey={(row) => row.id}
        emptyTitle="No products match"
        emptyDescription="A CAS number finds the exact substance; a partial name is typo-tolerant."
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
