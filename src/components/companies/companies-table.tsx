"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star } from "lucide-react";
import { useCompanies, useCountries } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { DataTable, type Column } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CompanyListItem } from "@/types/api";
import type { CompanyStatus, CompanyType } from "@/types/domain";

const TYPE_LABEL: Record<CompanyType, string> = {
  manufacturer: "Manufacturer",
  trader: "Trader",
  manufacturer_trader: "Mfr + Trader",
  agent: "Agent",
};

const STATUS_VARIANT: Record<
  CompanyStatus,
  "success" | "secondary" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  blacklisted: "destructive",
};

const PAGE_SIZE = 25;

export function CompaniesTable() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [countryId, setCountryId] = useState<number | undefined>();
  const [companyType, setCompanyType] = useState<CompanyType | undefined>();
  const [status, setStatus] = useState<CompanyStatus | undefined>();
  const [page, setPage] = useState(1);

  const debouncedQuery = useDebounced(query);

  const { data, isFetching, error } = useCompanies({
    q: debouncedQuery || undefined,
    country_id: countryId,
    company_type: companyType,
    status,
    page,
    size: PAGE_SIZE,
  });
  const { data: countries } = useCountries();

  /** Any filter change invalidates the current page number. */
  function resetTo(fn: () => void) {
    fn();
    setPage(1);
  }

  const columns: Column<CompanyListItem>[] = [
    {
      header: "Company",
      cell: (row) => (
        <div className="flex items-start gap-2">
          {row.is_watchlisted && (
            <Star
              className="mt-0.5 size-3.5 shrink-0 fill-warning text-warning"
              aria-label="Watchlisted"
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
      header: "Type",
      cell: (row) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {TYPE_LABEL[row.company_type] ?? row.company_type}
        </span>
      ),
      className: "hidden md:table-cell",
    },
    {
      header: "Country",
      cell: (row) => (
        <span className="whitespace-nowrap">{row.country?.name ?? "—"}</span>
      ),
      className: "hidden sm:table-cell",
    },
    {
      header: "City",
      cell: (row) => (
        <span className="text-muted-foreground">{row.city ?? "—"}</span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => resetTo(() => setQuery(e.target.value))}
            placeholder="Search companies…"
            className="pl-9"
            aria-label="Search companies"
          />
        </div>

        <FilterSelect
          label="Country"
          value={countryId ?? ""}
          onChange={(v) =>
            resetTo(() => setCountryId(v ? Number(v) : undefined))
          }
          options={(countries ?? []).map((c) => ({
            value: c.id,
            label: c.name,
          }))}
        />

        <FilterSelect
          label="Type"
          value={companyType ?? ""}
          onChange={(v) =>
            resetTo(() => setCompanyType((v as CompanyType) || undefined))
          }
          options={Object.entries(TYPE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />

        <FilterSelect
          label="Status"
          value={status ?? ""}
          onChange={(v) =>
            resetTo(() => setStatus((v as CompanyStatus) || undefined))
          }
          options={Object.keys(STATUS_VARIANT).map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.items}
        isLoading={isFetching}
        error={error}
        getRowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
        emptyTitle="No companies match"
        emptyDescription="Try clearing the filters, or import the supplier sheet to populate the catalogue."
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors hover:border-ring/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <option value="">{label}: all</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
