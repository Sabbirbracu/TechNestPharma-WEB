"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  CompanyCreateInput,
  CompanyCreateResult,
  CompanyDetail,
  CompanyListItem,
  CompanyListParams,
  CompanyUpdateInput,
  ContactCreateInput,
  ContactListItem,
  ContactUpdateInput,
  CountryRef,
  DashboardStats,
  ListParams,
  OfferCreateInput,
  OfferDetail,
  OfferListItem,
  OfferListParams,
  ProductListParams,
  OfferUpdateInput,
  Page,
  ProductCreateInput,
  ProductListItem,
  ProductUpdateInput,
  ImportBatch,
  ImportField,
  ImportPreviewSummary,
  ImportRow,
  ImportRowFilter,
  OcrBatchResult,
  OcrStatus,
  SearchResults,
  SheetPreview,
  ShortlistMembership,
  StageInput,
  TenderCreateInput,
  TenderDetail,
  TenderItemInput,
  TenderListItem,
  TenderListParams,
  TenderUpdateInput,
} from "@/types/api";

/**
 * Server state for every module. TanStack Query owns the cache; there is no
 * Redux store (decision 2026-08-10) because effectively all of this is a cache
 * of the API's data rather than client state.
 *
 * `keys` is a hierarchical key factory: invalidating `keys.companies.all`
 * clears every companies query regardless of its filters.
 */
export const keys = {
  dashboard: ["dashboard"] as const,
  countries: ["countries"] as const,
  search: (q: string) => ["search", q] as const,
  companies: {
    all: ["companies"] as const,
    list: (params: CompanyListParams) => ["companies", "list", params] as const,
    detail: (id: number) => ["companies", "detail", id] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: (params: ListParams) => ["contacts", "list", params] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params: ProductListParams) => ["products", "list", params] as const,
  },
  imports: {
    all: ["imports"] as const,
    fields: ["imports", "fields"] as const,
    ocrStatus: ["imports", "ocr-status"] as const,
    batches: (params: ListParams) => ["imports", "batches", params] as const,
    batch: (id: number) => ["imports", "batch", id] as const,
    summary: (id: number) => ["imports", "batch", id, "summary"] as const,
    rows: (id: number, params: Record<string, unknown>) =>
      ["imports", "batch", id, "rows", params] as const,
  },
  offers: {
    all: ["offers"] as const,
    list: (params: OfferListParams) => ["offers", "list", params] as const,
    detail: (id: number) => ["offers", "detail", id] as const,
  },
  tenders: {
    all: ["tenders"] as const,
    list: (params: TenderListParams) => ["tenders", "list", params] as const,
    detail: (id: number) => ["tenders", "detail", id] as const,
    /** Keyed by the sorted product ids on screen, so two searches that happen
     *  to show the same products share one cache entry. */
    memberships: (productIds: number[]) =>
      ["tenders", "memberships", productIds.join(",")] as const,
  },
};

/** Drop empty values so they never reach the URL as `?q=&page=1`. */
function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => apiFetch<DashboardStats>("/dashboard"),
  });
}

export function useCountries() {
  return useQuery({
    queryKey: keys.countries,
    queryFn: () => apiFetch<CountryRef[]>("/lookups/countries"),
    staleTime: 60 * 60 * 1000, // reference data; effectively static
  });
}

/** Global search across companies, products, and contacts (FR-SEARCH-01). */
export function useSearch(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: keys.search(query),
    queryFn: () =>
      apiFetch<SearchResults>(`/search${toQueryString({ q: query })}`),
    // An empty box shouldn't hit the API at all.
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCompanies(params: CompanyListParams) {
  return useQuery({
    queryKey: keys.companies.list(params),
    queryFn: () =>
      apiFetch<Page<CompanyListItem>>(`/companies${toQueryString(params)}`),
    // Keep the previous page on screen while the next one loads, so paging
    // and typing in the filter box don't flash an empty table.
    placeholderData: keepPreviousData,
  });
}

export function useCompany(id: number) {
  return useQuery({
    queryKey: keys.companies.detail(id),
    queryFn: () => apiFetch<CompanyDetail>(`/companies/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useContacts(params: ListParams) {
  return useQuery({
    queryKey: keys.contacts.list(params),
    queryFn: () =>
      apiFetch<Page<ContactListItem>>(`/contacts${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: keys.products.list(params),
    queryFn: () =>
      apiFetch<Page<ProductListItem>>(`/products${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

/** One offer in full. `null` disables the query — the search row it came from
 *  may have no offer id, and the caller should not have to branch on it. */
export function useOffer(id: number | null) {
  return useQuery({
    queryKey: keys.offers.detail(id ?? 0),
    queryFn: () => apiFetch<OfferDetail>(`/offers/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

export function useOffers(params: OfferListParams) {
  return useQuery({
    queryKey: keys.offers.list(params),
    queryFn: () =>
      apiFetch<Page<OfferListItem>>(`/offers${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

/** Creates a contact and refreshes both its company's detail page and the
 *  standalone contacts list, since both cache the same rows independently. */
export function useCreateContact(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ContactCreateInput) =>
      apiFetch("/contacts", { method: "POST", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.companies.detail(companyId) });
      queryClient.invalidateQueries({ queryKey: keys.contacts.all });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useUpdateContact(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ContactUpdateInput & { id: number }) =>
      apiFetch(`/contacts/${id}`, { method: "PATCH", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.companies.detail(companyId) });
      queryClient.invalidateQueries({ queryKey: keys.contacts.all });
    },
  });
}

export function useUpdateCompany(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompanyUpdateInput) =>
      apiFetch(`/companies/${companyId}`, { method: "PATCH", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.companies.detail(companyId) });
      queryClient.invalidateQueries({ queryKey: keys.companies.all });
    },
  });
}

/** Only needs the new id back, to chain into `useCreateOffer` — the fuller
 *  ProductCreateResult (same_cas warnings, etc.) isn't used here. */
export function useCreateProduct() {
  return useMutation({
    mutationFn: (payload: ProductCreateInput) =>
      apiFetch<{ product: { id: number } }>("/products", {
        method: "POST",
        json: payload,
      }),
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: ({ id, ...payload }: ProductUpdateInput & { id: number }) =>
      apiFetch(`/products/${id}`, { method: "PATCH", json: payload }),
  });
}

/** Links a product to a company as a supplier offer. Invalidates the
 *  company's offers (its "Product Catalogue" table) and the dashboard count. */
export function useCreateOffer(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OfferCreateInput) =>
      apiFetch("/offers", { method: "POST", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.offers.all });
      queryClient.invalidateQueries({ queryKey: keys.companies.detail(companyId) });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useUpdateOffer(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: OfferUpdateInput & { id: number }) =>
      apiFetch(`/offers/${id}`, { method: "PATCH", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.offers.all });
      queryClient.invalidateQueries({ queryKey: keys.companies.detail(companyId) });
    },
  });
}

/** Generic soft-delete for any module, invalidating that module's cache. */
export function useDeleteEntity(
  resource: "companies" | "contacts" | "products" | "offers",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

/* -------------------------------------------------------------------------
 * Tenders (FR-TENDER)
 * ---------------------------------------------------------------------- */

export function useTenders(params: TenderListParams = {}) {
  return useQuery({
    queryKey: keys.tenders.list(params),
    queryFn: () =>
      apiFetch<Page<TenderListItem>>(`/tenders${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useTender(id: number) {
  return useQuery({
    queryKey: keys.tenders.detail(id),
    queryFn: () => apiFetch<TenderDetail>(`/tenders/${id}`),
    enabled: Number.isFinite(id),
  });
}

/**
 * Which tenders the rows on screen are already shortlisted onto — one request
 * for the whole result page. Per-card lookups would mean a request per row on
 * every search, so the search page fetches this once and hands each card its
 * slice.
 */
export function useShortlistMemberships(productIds: number[]) {
  const ids = [...new Set(productIds)].sort((a, b) => a - b);
  return useQuery({
    queryKey: keys.tenders.memberships(ids),
    queryFn: () =>
      apiFetch<ShortlistMembership[]>(
        `/tenders/memberships${toQueryString({ product_ids: ids.join(",") })}`,
      ),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TenderCreateInput) =>
      apiFetch<TenderDetail>("/tenders", { method: "POST", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

export function useUpdateTender(tenderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TenderUpdateInput) =>
      apiFetch<TenderDetail>(`/tenders/${tenderId}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

/** Shortlists a search row onto a tender. The API is idempotent, so a double
 *  click costs a request but never an error. */
export function useAddTenderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenderId,
      ...payload
    }: TenderItemInput & { tenderId: number }) =>
      apiFetch(`/tenders/${tenderId}/items`, { method: "POST", json: payload }),
    onSuccess: () => {
      // Both the membership ticks on the search page and the tender's own
      // item counts move together.
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

export function useRemoveTenderItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenderId, itemId }: { tenderId: number; itemId: number }) =>
      apiFetch(`/tenders/${tenderId}/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

/* -- Import (SRS FR-IMP, 05-architecture Part C) --------------------------
 *
 * Three channels, one shared core, so most of this is channel-agnostic: only
 * `useAnalyseSheet` / `useStageSheet` (B) and `useImportLeaflet` (C) differ.
 * Channel A needs nothing here — manual entry writes through the ordinary
 * company/product/offer mutations above.
 */

/** The system fields a column can be mapped to. Static for the life of the
 *  session, so it is cached indefinitely rather than refetched per dialog. */
export function useImportFields() {
  return useQuery({
    queryKey: keys.imports.fields,
    queryFn: () => apiFetch<ImportField[]>("/imports/fields"),
    staleTime: Infinity,
  });
}

/** Whether the server can read a leaflet photo at all. Checked before the
 *  upload rather than after, so an operator on a box with no Tesseract is told
 *  up front instead of after picking a 4 MB file. */
export function useOcrStatus() {
  return useQuery({
    queryKey: keys.imports.ocrStatus,
    queryFn: () => apiFetch<OcrStatus>("/imports/ocr/status"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportBatches(params: ListParams = {}) {
  return useQuery({
    queryKey: keys.imports.batches(params),
    queryFn: () =>
      apiFetch<Page<ImportBatch>>(`/imports/batches${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useImportBatch(batchId: number) {
  return useQuery({
    queryKey: keys.imports.batch(batchId),
    queryFn: () => apiFetch<ImportBatch>(`/imports/batches/${batchId}`),
    enabled: Number.isFinite(batchId),
  });
}

export function useImportSummary(batchId: number) {
  return useQuery({
    queryKey: keys.imports.summary(batchId),
    queryFn: () =>
      apiFetch<ImportPreviewSummary>(`/imports/batches/${batchId}/summary`),
    enabled: Number.isFinite(batchId),
  });
}

export function useImportRows(
  batchId: number,
  params: { page?: number; size?: number; only?: ImportRowFilter | null } = {},
) {
  return useQuery({
    queryKey: keys.imports.rows(batchId, params),
    queryFn: () =>
      apiFetch<Page<ImportRow>>(
        `/imports/batches/${batchId}/rows${toQueryString(params)}`,
      ),
    enabled: Number.isFinite(batchId),
    placeholderData: keepPreviousData,
  });
}

/** Channel B, step 1: describe the file and suggest a mapping. Stages nothing,
 *  so it is safe to run on a file the user then abandons. */
export function useAnalyseSheet() {
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      // No Content-Type header: the browser must set the multipart boundary.
      return apiFetch<SheetPreview>("/imports/files/analyse", {
        method: "POST",
        body,
      });
    },
  });
}

/** Channel B, step 2: apply the confirmed mapping and stage every row. */
export function useStageSheet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StageInput) =>
      apiFetch<ImportBatch>("/imports/files/stage", {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.all });
    },
  });
}

/** Channel C: OCR a leaflet photo straight into a staged batch. */
export function useImportLeaflet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return apiFetch<OcrBatchResult>("/imports/leaflets", {
        method: "POST",
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.all });
    },
  });
}

/** Correct one staged cell. The server re-plans the whole batch, because
 *  fixing a company name changes whether later rows create or match it — so
 *  every view of this batch is invalidated, not just the edited row. */
export function useUpdateImportRow(batchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rowId,
      cells,
    }: {
      rowId: number;
      cells: Record<string, string>;
    }) =>
      apiFetch<ImportRow>(`/imports/batches/${batchId}/rows/${rowId}`, {
        method: "PATCH",
        json: { cells },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.batch(batchId) });
    },
  });
}

export function useDeleteImportRow(batchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rowId: number) =>
      apiFetch(`/imports/batches/${batchId}/rows/${rowId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.batch(batchId) });
    },
  });
}

export function useCommitImport(batchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skipInvalid: boolean) =>
      apiFetch<ImportBatch>(`/imports/batches/${batchId}/commit`, {
        method: "POST",
        json: { skip_invalid: skipInvalid },
      }),
    onSuccess: () => {
      // A commit writes companies, products and offers, so essentially every
      // cached list is now stale.
      queryClient.invalidateQueries();
    },
  });
}

export function useUndoImport(batchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ImportBatch>(`/imports/batches/${batchId}/undo`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDiscardImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: number) =>
      apiFetch(`/imports/batches/${batchId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.all });
    },
  });
}

/** Channel A (05-architecture C1): create one supplier by hand.
 *
 *  Returns near-duplicate warnings alongside the created company; the caller
 *  shows them, the API does not refuse the write (FR-CO-05). */
export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CompanyCreateInput) =>
      apiFetch<CompanyCreateResult>("/companies", {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.companies.all });
      queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}
