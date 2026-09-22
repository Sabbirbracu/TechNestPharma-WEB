"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Download,
  Eye,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Search as SearchIcon,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ResultsPagination } from "@/components/search/results-pagination";
import { ContactDetailPanel } from "@/components/contacts/contact-detail-panel";
import {
  useCompanies,
  useContactDepartments,
  useContacts,
  useCountries,
  useDeleteContact,
} from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { flagFor } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type { ContactListItem } from "@/types/api";

type SortValue = "name_en:asc" | "name_en:desc" | "created_at:desc" | "created_at:asc";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "name_en:asc", label: "Name (A-Z)" },
  { value: "name_en:desc", label: "Name (Z-A)" },
  { value: "created_at:desc", label: "Newest First" },
  { value: "created_at:asc", label: "Oldest First" },
];

const PAGE_SIZE_DEFAULT = 10;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** One hue per row, cycling by id — purely decorative. */
const AVATAR_STYLES = [
  "bg-tile-blue-bg text-tile-blue",
  "bg-tile-green-bg text-tile-green",
  "bg-tile-purple-bg text-tile-purple",
  "bg-tile-amber-bg text-tile-amber",
];

function avatarStyleFor(id: number): string {
  return AVATAR_STYLES[id % AVATAR_STYLES.length];
}

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function contactsToCsv(rows: ContactListItem[]): string {
  const columns = ["Name", "Company", "Designation", "Department", "Email", "Phone", "Country"];
  const lines = [columns.join(",")];
  for (const row of rows) {
    const email = row.channels.find((channel) => channel.channel === "email")?.value ?? "";
    const phone = row.channels.find((channel) => channel.channel === "phone")?.value ?? "";
    lines.push(
      [
        csvField(row.name_en),
        csvField(row.company.name_en),
        csvField(row.designation),
        csvField(row.department),
        csvField(email),
        csvField(phone),
        csvField(row.company.country?.name),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/** The BOM is deliberate: without it Excel on Windows reads the file as the
 *  system codepage and mangles every Chinese contact/company name. */
function downloadCsv(csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ContactsTable() {
  const [query, setQuery] = useState("");
  const [companyId, setCompanyId] = useState<number | "">("");
  const [department, setDepartment] = useState("");
  const [countryId, setCountryId] = useState<number | "">("");
  const [sort, setSort] = useState<SortValue>("name_en:asc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const debouncedQuery = useDebounced(query);
  const [sortField, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

  const { data: companies } = useCompanies({ size: 100, sort: "name_en", order: "asc" });
  const { data: departments } = useContactDepartments();
  const { data: countries } = useCountries();

  const params = {
    q: debouncedQuery || undefined,
    company_id: companyId || undefined,
    department: department || undefined,
    country_id: countryId || undefined,
    sort: sortField,
    order: sortOrder,
    page,
    size: pageSize,
  };

  const { data, isFetching, error } = useContacts(params);
  const rows = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const filtered = query !== "" || companyId !== "" || department !== "" || countryId !== "";

  // The panel needs a contact to show — default to the first row on screen,
  // the way a mail client opens on its top message rather than a blank pane.
  const activeId = selectedId ?? rows[0]?.id ?? null;

  function resetFilters() {
    setQuery("");
    setCompanyId("");
    setDepartment("");
    setCountryId("");
    setPage(1);
  }

  function changeAndReset(fn: () => void) {
    fn();
    setPage(1);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      downloadCsv(contactsToCsv(rows));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="relative col-span-2 lg:col-span-1">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => changeAndReset(() => setQuery(event.target.value))}
                placeholder="Search contacts by name, email, company…"
                className="pl-9"
                aria-label="Search contacts"
              />
            </div>

            <Select
              value={companyId}
              onChange={(event) =>
                changeAndReset(() =>
                  setCompanyId(event.target.value ? Number(event.target.value) : ""),
                )
              }
              aria-label="Filter by company"
            >
              <option value="">All Companies</option>
              {(companies?.items ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name_en}
                </option>
              ))}
            </Select>

            <Select
              value={department}
              onChange={(event) => changeAndReset(() => setDepartment(event.target.value))}
              aria-label="Filter by role or department"
            >
              <option value="">All Roles</option>
              {(departments ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>

            <Select
              value={countryId}
              onChange={(event) =>
                changeAndReset(() =>
                  setCountryId(event.target.value ? Number(event.target.value) : ""),
                )
              }
              aria-label="Filter by country"
            >
              <option value="">All Countries</option>
              {(countries ?? []).map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </Select>

            {filtered && (
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="col-span-2 lg:col-span-1"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className="text-sm font-bold text-foreground">
              All Contacts <span className="tabular-nums">({total.toLocaleString()})</span>
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={exporting || rows.length === 0}
                className="h-9"
              >
                {exporting ? (
                  <Loader2 className="animate-spin" strokeWidth={2.25} />
                ) : (
                  <Download strokeWidth={2.25} />
                )}
                Export
              </Button>

              <div className="hidden items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-sm md:flex">
                <ViewToggle
                  active={view === "list"}
                  onClick={() => setView("list")}
                  label="Table view"
                  icon={<List className="size-4" strokeWidth={2.25} />}
                />
                <ViewToggle
                  active={view === "grid"}
                  onClick={() => setView("grid")}
                  label="Card view"
                  icon={<LayoutGrid className="size-4" strokeWidth={2.25} />}
                />
              </div>

              <label className="flex items-center gap-2">
                <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                  Sort by:
                </span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortValue)}
                  aria-label="Sort contacts"
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

          {error ? (
            <TableError error={error} />
          ) : isFetching && rows.length === 0 ? (
            <TableLoading />
          ) : rows.length === 0 ? (
            <TableEmpty filtered={filtered} onReset={resetFilters} />
          ) : (
            <div
              className={cn(
                "transition-opacity duration-200",
                isFetching && "pointer-events-none opacity-60",
              )}
            >
              {/* A five-column table cannot be read on a phone, so below `md`
                  the cards are the only view and the toggle above is hidden.
                  From `md` up the toggle decides. */}
              <div className="md:hidden">
                <CardView rows={rows} activeId={activeId} onSelect={setSelectedId} />
              </div>
              <div className="hidden md:block">
                {view === "list" ? (
                  <ListView rows={rows} activeId={activeId} onSelect={setSelectedId} />
                ) : (
                  <CardView rows={rows} activeId={activeId} onSelect={setSelectedId} />
                )}
              </div>
            </div>
          )}

          {total > 0 && (
            <div className="border-t border-border/60 px-4 py-4 sm:px-5">
              <ResultsPagination
                page={data?.page ?? page}
                pageCount={data?.pages ?? 1}
                total={total}
                pageSize={pageSize}
                itemLabel="contacts"
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-5 lg:self-start">
        {activeId ? (
          <ContactDetailPanel contactId={activeId} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card p-8 text-center">
            <UserRound className="size-8 text-muted-foreground/50" />
            <p className="text-xs font-medium text-muted-foreground">
              Select a contact to see their details
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({
  rows,
  activeId,
  onSelect,
}: {
  rows: ContactListItem[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[24%]" />
          <col className="w-[18%]" />
          <col className="w-[18%]" />
          <col className="w-[80px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-border/60 bg-secondary/40">
            <HeaderCell>Contact</HeaderCell>
            <HeaderCell>Company</HeaderCell>
            <HeaderCell>Role / Department</HeaderCell>
            <HeaderCell>Reach</HeaderCell>
            <HeaderCell className="text-right">Actions</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.id} row={row} active={row.id === activeId} onSelect={() => onSelect(row.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  row,
  active,
  onSelect,
}: {
  row: ContactListItem;
  active: boolean;
  onSelect: () => void;
}) {
  const deleteContact = useDeleteContact();
  const [confirming, setConfirming] = useState(false);
  const email = row.channels.find((channel) => channel.channel === "email");
  const phone = row.channels.find((channel) => channel.channel === "phone");

  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-border/40 transition-colors last:border-0",
        active ? "bg-primary/[0.04]" : "hover:bg-accent/25",
      )}
      onClick={onSelect}
    >
      <td className="min-w-0 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              avatarStyleFor(row.id),
            )}
          >
            {initialsFromName(row.name_en)}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-bold text-foreground">
              {row.name_en}
              {row.is_primary && (
                <Star className="size-3 shrink-0 fill-warning text-warning" aria-label="Primary" />
              )}
            </p>
          </div>
        </div>
      </td>

      <td className="min-w-0 px-4 py-3.5">
        <p className="truncate text-xs font-bold text-foreground" title={row.company.name_en}>
          {row.company.name_en}
        </p>
        {row.company.country && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            {flagFor(row.company.country.iso2) && (
              <span aria-hidden>{flagFor(row.company.country.iso2)}</span>
            )}
            {row.company.country.name}
          </p>
        )}
      </td>

      <td className="min-w-0 px-4 py-3.5">
        <p className="truncate text-xs font-semibold text-foreground">{row.designation ?? "—"}</p>
        <p className="truncate text-[11px] font-medium text-muted-foreground">
          {row.department ?? ""}
        </p>
      </td>

      <td className="min-w-0 px-4 py-3.5">
        {email && (
          <p className="flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground">
            <Mail className="size-3 shrink-0" />
            <span className="truncate">{email.value}</span>
          </p>
        )}
        {phone && (
          <p className="flex items-center gap-1 truncate text-[11px] font-medium text-muted-foreground">
            <Phone className="size-3 shrink-0" />
            {phone.value}
          </p>
        )}
      </td>

      <td className="px-2 py-3.5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onSelect}
            aria-label={`View ${row.name_en}`}
            className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground"
          >
            <Eye className="size-4" strokeWidth={2.25} />
          </button>
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
                    onSelect();
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
                  Delete contact
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
        </div>
      </td>

      {confirming && (
        <ConfirmDialog
          title="Delete this contact?"
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
          busy={deleteContact.isPending}
          onConfirm={() => {
            deleteContact.mutate(row.id, { onSettled: () => setConfirming(false) });
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </tr>
  );
}

function CardView({
  rows,
  activeId,
  onSelect,
}: {
  rows: ContactListItem[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    // `grid-cols-1` caps the implicit column at the card's width; an `auto`
    // track sizes to the longest contact or company name and scrolls the page.
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
      {rows.map((row) => {
        const email = row.channels.find((channel) => channel.channel === "email");
        const phone = row.channels.find((channel) => channel.channel === "phone");
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              row.id === activeId ? "border-primary/50 bg-primary/[0.03]" : "border-border/60 bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  avatarStyleFor(row.id),
                )}
              >
                {initialsFromName(row.name_en)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-bold text-foreground">
                  {row.name_en}
                  {row.is_primary && (
                    <Star className="size-3 shrink-0 fill-warning text-warning" />
                  )}
                </p>
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {row.designation ?? row.department ?? "No role on file"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-t border-border/50 pt-2.5 text-xs">
              <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate font-semibold text-foreground">{row.company.name_en}</span>
            </div>

            {(email || phone) && (
              <div className="space-y-1">
                {email && (
                  <p className="flex items-center gap-1.5 truncate text-[11px] font-medium text-muted-foreground">
                    <Mail className="size-3 shrink-0" />
                    <span className="truncate">{email.value}</span>
                  </p>
                )}
                {phone && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <Phone className="size-3 shrink-0" />
                    {phone.value}
                  </p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
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
        <p className="text-sm font-bold text-destructive">Could not load contacts</p>
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
      <span className="text-sm font-medium text-muted-foreground">Loading contacts…</span>
    </div>
  );
}

function TableEmpty({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-border/50">
        <UserRound className="size-6" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">
          {filtered ? "No contacts match these filters" : "No contacts yet"}
        </p>
        <p className="max-w-md text-xs font-medium text-muted-foreground">
          {filtered
            ? "Try clearing the filters, or add the first contact for a company."
            : "Add your first contact, or import the supplier sheet to populate the catalogue."}
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
