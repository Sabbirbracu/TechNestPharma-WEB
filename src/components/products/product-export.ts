import { apiFetch } from "@/lib/api";
import type { Page, ProductListItem, ProductListParams } from "@/types/api";
import { CATEGORY_STYLES, applicationLabel } from "./product-taxonomy";

/**
 * CSV export for the products table.
 *
 * Exports what the user is looking at — every row matching the current filters,
 * not just the page on screen — because "export" after filtering means the
 * filtered set. The API caps a page at 100 (settings.max_page_size), so this
 * walks pages rather than asking for everything at once.
 */

/** A ceiling on how many requests one click can fire. 50 pages × 100 rows
 *  covers the catalogue several times over; past that the user wants a
 *  server-side export, not a browser holding 5,000 rows in memory. */
const MAX_PAGES = 50;
const PAGE_SIZE = 100;

const COLUMNS = [
  "Product Name",
  "Chinese Name",
  "Variant",
  "Category",
  "CAS No.",
  "CAS Verified",
  "Pharmacopoeia",
  "Countries",
  "Applications",
  "Therapeutic Classes",
  "Suppliers",
  "Added On",
] as const;

function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Fetch every row matching `params`, ignoring its page/size. */
export async function fetchAllProducts(
  params: ProductListParams,
): Promise<{ rows: ProductListItem[]; truncated: boolean }> {
  const rows: ProductListItem[] = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await apiFetch<Page<ProductListItem>>(
      `/products${toQueryString({ ...params, page, size: PAGE_SIZE })}`,
    );
    rows.push(...result.items);
    pages = result.pages;
    page += 1;
  } while (page <= pages && page <= MAX_PAGES);

  return { rows, truncated: pages > MAX_PAGES };
}

/**
 * One CSV field. Quotes anything containing a delimiter, quote, or newline, and
 * doubles embedded quotes — RFC 4180. A leading `=`, `+`, `-` or `@` is
 * prefixed with a quote so a spreadsheet reads it as text: product names in
 * this catalogue genuinely start with `-` and `(+/-)`, and Excel would treat
 * those as formulas.
 */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function productsToCsv(rows: ProductListItem[]): string {
  const lines = [COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvField(row.name_en),
        csvField(row.name_cn),
        csvField(row.variant),
        csvField(
          row.facets.material_types
            .map((type) => CATEGORY_STYLES[type]?.label ?? type)
            .join("; "),
        ),
        csvField(row.cas_number),
        csvField(row.cas_number ? (row.cas_is_verified ? "yes" : "no") : ""),
        csvField(row.facets.compendia.join("; ")),
        csvField(row.facets.countries.map((country) => country.name).join("; ")),
        csvField(row.facets.applications.map(applicationLabel).join("; ")),
        csvField(row.therapeutic_classes.join("; ")),
        csvField(row.facets.supplier_count),
        csvField(row.created_at ? row.created_at.slice(0, 10) : ""),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

/**
 * Hand the CSV to the browser as a download.
 *
 * The BOM is deliberate: without it Excel on Windows reads the file as the
 * system codepage and mangles every Chinese product name.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportFilename(): string {
  return `products-${new Date().toISOString().slice(0, 10)}.csv`;
}
