"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Eye,
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  Search as SearchIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResultsPagination } from "@/components/search/results-pagination";
import { CATEGORY_FILTER_OPTIONS } from "@/components/products/product-taxonomy";
import { useCompanies, useCountries, useDeleteCompany } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { flagFor } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type { CompanyListItem } from "@/types/api";
import type { CompanyStatus, CompanyType, MaterialType } from "@/types/domain";

const TYPE_LABEL: Record<CompanyType, string> = {
  manufacturer: "Manufacturer",
  trader: "Trader",
  manufacturer_trader: "Mfr + Trader",
  agent: "Agent",
};

const STATUS_STYLE: Record<CompanyStatus, { label: string; dot: string; text: string }> = {
  active: { label: "Active", dot: "bg-success", text: "text-success" },
  inactive: { label: "Inactive", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  blacklisted: { label: "Blacklisted", dot: "bg-destructive", text: "text-destructive" },
};

/** One hue per row, cycling by id — purely decorative, so a company's tile
 *  color is stable across renders without meaning anything about the company
 *  itself. */
const AVATAR_STYLES = [
  "bg-tile-blue-bg text-tile-blue",
  "bg-tile-green-bg text-tile-green",
  "bg-tile-purple-bg text-tile-purple",
  "bg-tile-amber-bg text-tile-amber",
];

function avatarStyleFor(id: number): string {
  return AVATAR_STYLES[id % AVATAR_STYLES.length];
}

function avatarLabelFor(company: CompanyListItem): string {
  if (company.short_name) return company.short_name.slice(0, 10).toUpperCase();
  const words = company.name_en.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const PAGE_SIZE_DEFAULT = 10;

export function CompaniesTable() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [countryId, setCountryId] = useState<number | "">("");
  const [companyType, setCompanyType] = useState<CompanyType | "">("");
  const [status, setStatus] = useState<CompanyStatus | "">("");
  const [materialType, setMaterialType] = useState<MaterialType | "">("");
  const [watchlistedOnly, setWatchlistedOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);

  const debouncedQuery = useDebounced(query);
  const { data: countries } = useCountries();

  const { data, isFetching, error } = useCompanies({
    q: debouncedQuery || undefined,
    country_id: countryId || undefined,
    company_type: companyType || undefined,
    status: status || undefined,
    material_type: materialType || undefined,
    is_watchlisted: watchlistedOnly || undefined,
    page,
    size: pageSize,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const filtered =
    query !== "" ||
    countryId !== "" ||
    companyType !== "" ||
    status !== "" ||
    materialType !== "" ||
    watchlistedOnly;

  function resetTo(fn: () => void) {
    fn();
    setPage(1);
  }

  function resetFilters() {
    setQuery("");
    setCountryId("");
    setCompanyType("");
    setStatus("");
    setMaterialType("");
    setWatchlistedOnly(false);
    setPage(1);
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="space-y-3 border-b border-border/60 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => resetTo(() => setQuery(event.target.value))}
              placeholder="Search companies by name, city or contact..."
              className="pl-9"
              aria-label="Search companies"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-40">
              <Select
                value={countryId}
                onChange={(event) =>
                  resetTo(() =>
                    setCountryId(event.target.value ? Number(event.target.value) : ""),
                  )
                }
                aria-label="Filter by country"
              >
                <option value="">Country: All</option>
                {(countries ?? []).map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <Select
                value={companyType}
                onChange={(event) =>
                  resetTo(() => setCompanyType(event.target.value as CompanyType | ""))
                }
                aria-label="Filter by type"
              >
                <option value="">Type: All</option>
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-40">
              <Select
                value={status}
                onChange={(event) =>
                  resetTo(() => setStatus(event.target.value as CompanyStatus | ""))
                }
                aria-label="Filter by status"
              >
                <option value="">Status: All</option>
                {Object.entries(STATUS_STYLE).map(([value, style]) => (
                  <option key={value} value={value}>
                    {style.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="button"
              variant={showMoreFilters || materialType !== "" || watchlistedOnly ? "default" : "outline"}
              onClick={() => setShowMoreFilters((value) => !value)}
              className="h-10"
            >
              <Filter className="size-4" strokeWidth={2.25} />
              Filters
            </Button>
          </div>
        </div>

        {showMoreFilters && (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-3">
            <div className="w-52">
              <Select
                value={materialType}
                onChange={(event) =>
                  resetTo(() => setMaterialType(event.target.value as MaterialType | ""))
                }
                aria-label="Filter by material supplied"
                className="h-9 text-xs"
              >
                <option value="">Supplies: Any material</option>
                {CATEGORY_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <label className="flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground shadow-sm">
              <Checkbox
                checked={watchlistedOnly}
                onChange={(event) => resetTo(() => setWatchlistedOnly(event.target.checked))}
                aria-label="Watchlisted companies only"
              />
              Watchlisted only
            </label>

            {filtered && (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {error ? (
        <TableError error={error} />
      ) : isFetching && rows.length === 0 ? (
        <TableLoading />
      ) : rows.length === 0 ? (
        <TableEmpty filtered={filtered} onReset={resetFilters} />
      ) : (
        <div
          className={cn(
            "overflow-x-auto transition-opacity duration-200",
            isFetching && "pointer-events-none opacity-60",
          )}
        >
          <table className="w-full min-w-[880px] table-fixed border-collapse text-sm">
            <colgroup>
              <col />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="border-b border-border/60 bg-secondary/40">
                <HeaderCell>Company</HeaderCell>
                <HeaderCell>Type</HeaderCell>
                <HeaderCell>Country</HeaderCell>
                <HeaderCell>City</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell className="text-right">Action</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Row key={row.id} row={row} onView={() => router.push(`/companies/${row.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="border-t border-border/60 px-4 py-4 sm:px-5">
          <ResultsPagination
            page={data?.page ?? page}
            pageCount={data?.pages ?? 1}
            total={total}
            pageSize={pageSize}
            itemLabel="companies"
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
  );
}

function Row({ row, onView }: { row: CompanyListItem; onView: () => void }) {
  const deleteCompany = useDeleteCompany();
  const [confirming, setConfirming] = useState(false);

  return (
    <tr
      className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-accent/25"
      onClick={onView}
    >
      <td className="min-w-0 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ring-1 ring-inset ring-border/50",
              avatarStyleFor(row.id),
            )}
          >
            {avatarLabelFor(row)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground" title={row.name_en}>
              {row.name_en}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {row.email && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Mail className="size-3" strokeWidth={2} />
                  <span className="truncate">{row.email}</span>
                </span>
              )}
              {row.phone && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Phone className="size-3" strokeWidth={2} />
                  {row.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3.5">
        <span className="text-xs font-semibold text-muted-foreground">
          {TYPE_LABEL[row.company_type]}
        </span>
      </td>

      <td className="px-4 py-3.5">
        {row.country ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            {flagFor(row.country.iso2) && <span aria-hidden>{flagFor(row.country.iso2)}</span>}
            {row.country.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">—</span>
        )}
      </td>

      <td className="px-4 py-3.5">
        <span className="text-xs font-medium text-muted-foreground">{row.city ?? "—"}</span>
      </td>

      <td className="px-4 py-3.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-semibold",
            STATUS_STYLE[row.status].text,
          )}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_STYLE[row.status].dot)} />
          {STATUS_STYLE[row.status].label}
        </span>
      </td>

      <td className="px-2 py-3.5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-end">
          <DropdownMenu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label={`Actions for ${row.name_en}`}
                className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <MoreHorizontal className="size-4" strokeWidth={2.25} />
              </button>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onClick={() => {
                    close();
                    setConfirming(true);
                  }}
                >
                  <Trash2 />
                  Delete company
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </td>

      {confirming && (
        <ConfirmDialog
          title="Delete this company?"
          description={
            <>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{row.name_en}&quot;
              </span>
              ? This cannot be undone from here.
            </>
          }
          confirmLabel="Delete"
          busy={deleteCompany.isPending}
          onConfirm={() => {
            deleteCompany.mutate(row.id, { onSettled: () => setConfirming(false) });
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </tr>
  );
}

function HeaderCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

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
        <p className="text-sm font-bold text-destructive">Could not load companies</p>
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
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-sm font-medium text-muted-foreground">Loading companies…</span>
    </div>
  );
}

function TableEmpty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-border/50">
        <Building2 className="size-6" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {filtered ? "No companies match these filters" : "No companies yet"}
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {filtered
            ? "Try clearing the filters, or import the supplier sheet to populate the catalogue."
            : "Add your first supplier, or import the supplier sheet to populate the catalogue."}
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
