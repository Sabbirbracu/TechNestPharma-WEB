"use client";

import { useState } from "react";
import { Search, Star } from "lucide-react";
import { useContacts } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import type { ContactListItem } from "@/types/api";

const PAGE_SIZE = 25;

export function ContactsTable() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQuery = useDebounced(query);

  const { data, isFetching, error } = useContacts({
    q: debouncedQuery || undefined,
    page,
    size: PAGE_SIZE,
  });

  const columns: Column<ContactListItem>[] = [
    {
      header: "Name",
      cell: (row) => (
        <div className="flex items-start gap-2">
          {row.is_primary && (
            <Star
              className="mt-0.5 size-3.5 shrink-0 fill-warning text-warning"
              aria-label="Primary contact"
            />
          )}
          <div className="min-w-0">
            <p className="font-medium">{row.name_en}</p>
            {row.name_cn && (
              <p className="text-xs text-muted-foreground">{row.name_cn}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "Company",
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.company?.name_en ?? "—"}
        </span>
      ),
    },
    {
      header: "Designation",
      cell: (row) => row.designation ?? "—",
      className: "hidden md:table-cell",
    },
    {
      header: "Department",
      cell: (row) => (
        <span className="text-muted-foreground">{row.department ?? "—"}</span>
      ),
      className: "hidden lg:table-cell",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search contacts…"
          className="pl-9"
          aria-label="Search contacts"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        isLoading={isFetching}
        error={error}
        getRowKey={(row) => row.id}
        emptyTitle="No contacts match"
        emptyDescription="Contacts arrive with the supplier sheet, or can be added against a company."
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
