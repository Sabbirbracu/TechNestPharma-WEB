"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type {
  CompanyListItem,
  CompanyListParams,
  ContactListItem,
  CountryRef,
  DashboardStats,
  ListParams,
  OfferListItem,
  Page,
  ProductListItem,
  SearchResults,
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
    list: (params: ListParams) => ["products", "list", params] as const,
  },
  offers: {
    all: ["offers"] as const,
    list: (params: ListParams) => ["offers", "list", params] as const,
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

export function useContacts(params: ListParams) {
  return useQuery({
    queryKey: keys.contacts.list(params),
    queryFn: () =>
      apiFetch<Page<ContactListItem>>(`/contacts${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useProducts(params: ListParams) {
  return useQuery({
    queryKey: keys.products.list(params),
    queryFn: () =>
      apiFetch<Page<ProductListItem>>(`/products${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useOffers(params: ListParams) {
  return useQuery({
    queryKey: keys.offers.list(params),
    queryFn: () =>
      apiFetch<Page<OfferListItem>>(`/offers${toQueryString(params)}`),
    placeholderData: keepPreviousData,
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
