/**
 * Search result shaping for the results screen.
 *
 * The API answers in a product-shaped tree (a product, with its suppliers
 * nested under it). The results screen reads as a flat list of *offers* —
 * one card per product/supplier pair — because that is the unit the client
 * actually acts on: "Paracetamol from Aurobindo" is a different lead from
 * "Paracetamol from Incepta", with its own spec, packing, and contact.
 *
 * Facets are derived here rather than fetched: `/search` returns the matched
 * page whole (services/search.py caps at 20 products), so every count the
 * sidebar shows is computable from what is already in hand. When the result
 * set outgrows one page this has to move server-side — see `facetsFor`.
 */

import type { MaterialType } from "@/types/domain";
import type { SearchResults, SearchSupplier } from "@/types/api";

type SearchProduct = SearchResults["products"][number];

/** One card on the results screen: a product as offered by one supplier. */
export type ResultRow = {
  /** Stable across re-renders and unique per card. */
  key: string;
  product: SearchProduct;
  supplier: SearchSupplier;
  /** Pharmacopoeia / regulatory tokens parsed out of this supplier's free-text
   *  qualification and spec fields — see `parseStandards`. */
  standards: string[];
};

export type FacetKind = "category" | "country" | "standard";

export type FacetValue = {
  /** The value stored in filter state — an enum member, country name, or token. */
  value: string;
  /** What the sidebar shows. */
  label: string;
  count: number;
};

export type Facets = Record<FacetKind, FacetValue[]>;

/** Active selections, one set per facet group. Empty set = no constraint. */
export type FilterState = Record<FacetKind, string[]>;

export const EMPTY_FILTERS: FilterState = {
  category: [],
  country: [],
  standard: [],
};

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name_asc", label: "Product A–Z" },
  { value: "name_desc", label: "Product Z–A" },
  { value: "supplier_asc", label: "Manufacturer A–Z" },
  { value: "country_asc", label: "Country A–Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  api: "API",
  intermediate: "Intermediate",
  excipient: "Excipient",
  packaging_material: "Packaging Material",
  finished_product: "Finished Product",
  semi_finished_product: "Semi Finished Product",
  vitamin: "Vitamin",
  amino_acid: "Amino Acid",
  plant_extract: "Plant Extract",
  food_additive: "Food Additive",
  solvent: "Solvent",
  enzyme: "Enzyme",
  cosmetic_ingredient: "Cosmetic Ingredient",
  other: "Other",
};

/**
 * Pharmacopoeia and regulatory markers, longest-first so "Ph.Eur" is claimed
 * by EP before a bare "EP" pattern can match inside another word. Suppliers
 * write these a dozen ways in one free-text column ("USP/BP", "Ph. Eur.",
 * "US-DMF filed"), so each token owns the spellings seen in the source sheet
 * rather than relying on one generic pattern.
 */
const STANDARD_PATTERNS: { token: string; re: RegExp }[] = [
  { token: "USP", re: /\bUSP\b|\bU\.?S\.?P\.?\b/i },
  { token: "BP", re: /\bBP\b|\bB\.?P\.?\b|\bBrit(?:ish)?\s*Pharm/i },
  { token: "EP", re: /\bEP\b|\bPh\.?\s*Eur\b|\bEuro(?:pean)?\s*Pharm/i },
  { token: "JP", re: /\bJP\b|\bJapan(?:ese)?\s*Pharm/i },
  { token: "IP", re: /\bIP\b|\bIndian\s*Pharm/i },
  { token: "CP", re: /\bCP\b|\bChP\b|\bChin(?:a|ese)\s*Pharm/i },
  { token: "CEP", re: /\bCEP\b|\bCoS\b|\bCertificate\s+of\s+Suitability\b/i },
  { token: "DMF", re: /\bDMF\b|\bDrug\s*Master\s*File\b/i },
  { token: "GMP", re: /\bGMP\b|\bcGMP\b/i },
  { token: "WHO-GMP", re: /\bWHO[-\s]?GMP\b/i },
  { token: "FDA", re: /\bUS[-\s]?FDA\b|\bFDA\s*(?:approved|registered|inspected)\b/i },
  { token: "ISO", re: /\bISO\s?\d{4,5}\b/i },
];

/** Every standard mentioned in a supplier's qualification or spec text. */
export function parseStandards(supplier: SearchSupplier): string[] {
  const haystack = [supplier.qualification, supplier.specification]
    .filter(Boolean)
    .join(" ");
  if (!haystack) return [];
  // WHO-GMP subsumes GMP: a row qualified "WHO-GMP" shouldn't also count
  // toward the looser GMP facet, or the two rows double-count the same fact.
  const found = STANDARD_PATTERNS.filter(({ re }) => re.test(haystack)).map(
    ({ token }) => token,
  );
  return found.includes("WHO-GMP") ? found.filter((t) => t !== "GMP") : found;
}

/** product tree -> flat offer rows, in the order the API ranked them. */
export function toRows(data: SearchResults | undefined): ResultRow[] {
  if (!data) return [];
  return data.products.flatMap((product) =>
    product.suppliers.map((supplier) => ({
      key: `${product.id}-${supplier.company_id}`,
      product,
      supplier,
      standards: parseStandards(supplier),
    })),
  );
}

/** Does one row satisfy one facet group? An empty selection constrains nothing. */
function matchesGroup(row: ResultRow, kind: FacetKind, selected: string[]): boolean {
  if (selected.length === 0) return true;
  if (kind === "category") {
    return row.supplier.material_type !== null &&
      selected.includes(row.supplier.material_type);
  }
  if (kind === "country") {
    return row.supplier.country !== null && selected.includes(row.supplier.country);
  }
  // Standards are OR-ed within the group: "USP or BP", not "USP and BP" —
  // a buyer ticking three pharmacopoeias is widening the net, not narrowing it.
  return row.standards.some((token) => selected.includes(token));
}

export function applyFilters(rows: ResultRow[], filters: FilterState): ResultRow[] {
  return rows.filter((row) =>
    (Object.keys(EMPTY_FILTERS) as FacetKind[]).every((kind) =>
      matchesGroup(row, kind, filters[kind]),
    ),
  );
}

/**
 * Counts for one facet group, computed against rows that already satisfy the
 * *other* groups. That is what keeps the numbers honest: with "India" ticked,
 * the category counts describe Indian suppliers only, so no checkbox can ever
 * promise results it would not deliver.
 */
function countsFor(
  rows: ResultRow[],
  filters: FilterState,
  kind: FacetKind,
): Map<string, number> {
  const others = (Object.keys(EMPTY_FILTERS) as FacetKind[]).filter((k) => k !== kind);
  const scoped = rows.filter((row) =>
    others.every((k) => matchesGroup(row, k, filters[k])),
  );

  const counts = new Map<string, number>();
  const bump = (value: string) => counts.set(value, (counts.get(value) ?? 0) + 1);

  for (const row of scoped) {
    if (kind === "category" && row.supplier.material_type) bump(row.supplier.material_type);
    if (kind === "country" && row.supplier.country) bump(row.supplier.country);
    if (kind === "standard") row.standards.forEach(bump);
  }
  return counts;
}

/** A facet value stays listed at count 0 while it is ticked, so the user can
 *  always untick it — dropping it would strand the filter with no way back. */
function toFacetValues(
  counts: Map<string, number>,
  selected: string[],
  label: (value: string) => string,
): FacetValue[] {
  const values = new Set([...counts.keys(), ...selected]);
  return [...values]
    .map((value) => ({ value, label: label(value), count: counts.get(value) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function facetsFor(rows: ResultRow[], filters: FilterState): Facets {
  return {
    category: toFacetValues(
      countsFor(rows, filters, "category"),
      filters.category,
      (value) => MATERIAL_TYPE_LABEL[value as MaterialType] ?? value,
    ),
    country: toFacetValues(
      countsFor(rows, filters, "country"),
      filters.country,
      (value) => value,
    ),
    standard: toFacetValues(
      countsFor(rows, filters, "standard"),
      filters.standard,
      (value) => value,
    ),
  };
}

const collator = new Intl.Collator(undefined, { sensitivity: "base" });

export function sortRows(rows: ResultRow[], sort: SortValue): ResultRow[] {
  if (sort === "relevance") return rows; // the API's ranking is the relevance order
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return collator.compare(a.product.name_en, b.product.name_en);
      case "name_desc":
        return collator.compare(b.product.name_en, a.product.name_en);
      case "supplier_asc":
        return collator.compare(a.supplier.company_name, b.supplier.company_name);
      case "country_asc":
        return collator.compare(a.supplier.country ?? "￿", b.supplier.country ?? "￿");
      default:
        return 0;
    }
  });
  return sorted;
}

export function countActiveFilters(filters: FilterState): number {
  return Object.values(filters).reduce((sum, list) => sum + list.length, 0);
}

/** ISO 3166-1 alpha-2 -> flag emoji, via the regional-indicator block. */
export function flagFor(iso2: string | null): string | null {
  if (!iso2 || iso2.length !== 2 || !/^[a-z]{2}$/i.test(iso2)) return null;
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
