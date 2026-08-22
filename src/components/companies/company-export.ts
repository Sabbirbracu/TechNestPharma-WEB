import { apiFetch } from "@/lib/api";
import type { CompanyListItem, Page } from "@/types/api";

/**
 * CSV export for the companies directory — the header button, so it exports
 * the whole network regardless of what the table below happens to be
 * filtered to right now (the table's own toolbar has no export of its own;
 * "everything" is the one unambiguous answer for a button that lives outside
 * the filter bar).
 */

const MAX_PAGES = 50;
const PAGE_SIZE = 100;

const COLUMNS = [
  "Company",
  "Chinese Name",
  "Short Name",
  "Type",
  "Status",
  "Country",
  "City",
  "Website",
  "Email",
  "Phone",
] as const;

export async function fetchAllCompanies(): Promise<CompanyListItem[]> {
  const rows: CompanyListItem[] = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await apiFetch<Page<CompanyListItem>>(
      `/companies?page=${page}&size=${PAGE_SIZE}`,
    );
    rows.push(...result.items);
    pages = result.pages;
    page += 1;
  } while (page <= pages && page <= MAX_PAGES);

  return rows;
}

/** RFC 4180, plus a quote in front of anything a spreadsheet would read as a
 *  formula — company names in this directory genuinely start with symbols. */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function companiesToCsv(rows: CompanyListItem[]): string {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvField(row.name_en),
        csvField(row.name_cn),
        csvField(row.short_name),
        csvField(row.company_type),
        csvField(row.status),
        csvField(row.country?.name),
        csvField(row.city),
        csvField(row.website),
        csvField(row.email),
        csvField(row.phone),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/** The BOM is deliberate: without it Excel on Windows reads the file as the
 *  system codepage and mangles every Chinese company name. */
export function downloadCsv(csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `companies-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
