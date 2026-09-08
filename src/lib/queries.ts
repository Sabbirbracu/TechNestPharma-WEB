"use client";

import {
  useQuery,
  useInfiniteQuery,
  useQueries,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth, type AuthUser } from "@/lib/auth";
import type {
  AccountSession,
  AdminUser,
  AdminUserListParams,
  AuditLogEntry,
  AuditLogParams,
  CreateUserInput,
  CreateUserResult,
  UserRole,
  CompanyCreateInput,
  CompanyCreateResult,
  CompanyDetail,
  CompanyListItem,
  CompanyListParams,
  CompanyStats,
  CompanyUpdateInput,
  ContactActivityEntry,
  ContactCreateInput,
  ContactDetail,
  ContactListItem,
  ContactListParams,
  ContactStats,
  ContactUpdateInput,
  CountryRef,
  DashboardStats,
  DashboardTimeseries,
  DirectSendInput,
  ExtractionResult,
  InboxBucket,
  InboxPage,
  SampleCreateInput,
  SampleListParams,
  SamplePipeline,
  SampleRequestDetail,
  SampleRequestListItem,
  SampleStatusChangeInput,
  SampleUpdateInput,
  SentMailParams,
  SentMessage,
  InboxThread,
  MatchCandidate,
  SenderRule,
  SenderRuleInput,
  ThreadFiled,
  NoticeConfirmResult,
  NoticeFetchReport,
  NoticeScheduleUpdate,
  NoticeSource,
  NoticeTender,
  NoticeTenderItem,
  NoticeTenderUpdateInput,
  TenderItemMappingInput,
  TenderNoticeDetail,
  TenderNoticeListItem,
  TenderNoticeParams,
  TenderConfirmResult,
  AppNotification,
  UnreadCount,
  MarkAllReadResult,
  DeleteAllNotificationsResult,
  InquiryDraft,
  InquiryPreviewInput,
  MailboxSettings,
  MailMessage,
  MailSendInput,
  MailSyncResult,
  MailThread,
  ListParams,
  OfferCreateInput,
  OfferDetail,
  OfferListItem,
  OfferListParams,
  ProductListParams,
  OfferUpdateInput,
  Page,
  ProductCreateInput,
  ProductDetail,
  ProductListItem,
  ProductStats,
  ProductSuppliers,
  TherapeuticCategoryRef,
  ProductUpdateInput,
  ImportBatch,
  ImportField,
  ImportPreviewSummary,
  ImportRow,
  ImportRowFilter,
  OcrBatchResult,
  OcrStatus,
  RecoveryCodes,
  SearchResults,
  SheetPreview,
  ShortlistMembership,
  TwoFactorSetup,
  Communication,
  CommunicationCreateInput,
  SourcingPipeline,
  SourcingRequestCreateInput,
  SourcingRequestDetail,
  SourcingRequestListItem,
  SourcingRequestParams,
  SourcingRequestUpdateInput,
  SourcingStatus,
  StageInput,
  TenderCreateInput,
  TenderDetail,
  TenderShortlistInput,
  TenderListItem,
  TenderListParams,
  TenderStats,
  TenderUpdateInput,
  ActivityEntry,
  DocType,
  DocumentItem,
  DocumentListParams,
  DocumentStats,
  DocumentTarget,
  DocumentUploadResult,
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
  dashboardTimeseries: (windowDays: number) =>
    ["dashboard", "timeseries", windowDays] as const,
  account: {
    sessions: ["account", "sessions"] as const,
  },
  admin: {
    users: (params: AdminUserListParams) => ["admin", "users", params] as const,
    activityLog: (params: AuditLogParams) => ["admin", "activity-log", params] as const,
  },
  countries: ["countries"] as const,
  notifications: {
    all: ["notifications"] as const,
    list: (page: number, unreadOnly: boolean) =>
      ["notifications", "list", page, unreadOnly] as const,
    unread: ["notifications", "unread"] as const,
  },
  activity: (limit: number) => ["activity", limit] as const,
  therapeuticCategories: ["therapeutic-categories"] as const,
  search: (q: string) => ["search", q] as const,
  companies: {
    all: ["companies"] as const,
    list: (params: CompanyListParams) => ["companies", "list", params] as const,
    detail: (id: number) => ["companies", "detail", id] as const,
    stats: ["companies", "stats"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: (params: ContactListParams) => ["contacts", "list", params] as const,
    detail: (id: number) => ["contacts", "detail", id] as const,
    stats: ["contacts", "stats"] as const,
    departments: ["contacts", "departments"] as const,
    activity: (id: number) => ["contacts", "activity", id] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: (params: DocumentListParams) => ["documents", "list", params] as const,
    detail: (id: number) => ["documents", "detail", id] as const,
    stats: ["documents", "stats"] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params: ProductListParams) => ["products", "list", params] as const,
    detail: (id: number) => ["products", "detail", id] as const,
    suppliers: (id: number) => ["products", "detail", id, "suppliers"] as const,
    stats: ["products", "stats"] as const,
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
  /** Deliberately NOT under the `tender-notices` prefix: every notice
   *  mutation invalidates that whole prefix, and the stored document is the
   *  one thing on the page that never changes — refetching a 4 MB scan on
   *  each mapping click would be pure waste. */
  noticeDocument: (id: number) => ["tender-notice-document", id] as const,
  tenderNotices: {
    all: ["tender-notices"] as const,
    list: (params: TenderNoticeParams) =>
      ["tender-notices", "list", params] as const,
    detail: (id: number) => ["tender-notices", "detail", id] as const,
    sources: ["tender-notices", "sources"] as const,
    candidates: (itemId: number) =>
      ["tender-notices", "candidates", itemId] as const,
  },
  mailbox: {
    all: ["mailbox"] as const,
    settings: ["mailbox", "settings"] as const,
    thread: (requestId: number) => ["mailbox", "thread", requestId] as const,
    preview: (input: InquiryPreviewInput) =>
      ["mailbox", "preview", input] as const,
    inbox: (bucket: string, pageToken: string | null) =>
      ["mailbox", "inbox", bucket, pageToken] as const,
    inboxThread: (threadId: string) =>
      ["mailbox", "inbox-thread", threadId] as const,
    /** The prefix, for invalidating every page and filter at once. */
    sentAll: ["mailbox", "sent"] as const,
    sent: (params: SentMailParams) => ["mailbox", "sent", params] as const,
    senderRules: ["mailbox", "sender-rules"] as const,
  },
  samples: {
    all: ["samples"] as const,
    list: (params: SampleListParams) => ["samples", "list", params] as const,
    detail: (id: number) => ["samples", "detail", id] as const,
    pipeline: ["samples", "pipeline"] as const,
  },
  sourcing: {
    all: ["sourcing"] as const,
    list: (params: SourcingRequestParams) => ["sourcing", "list", params] as const,
    detail: (id: number) => ["sourcing", "detail", id] as const,
    pipeline: ["sourcing", "pipeline"] as const,
  },
  tenders: {
    all: ["tenders"] as const,
    list: (params: TenderListParams) => ["tenders", "list", params] as const,
    detail: (id: number) => ["tenders", "detail", id] as const,
    stats: (scope?: string) => ["tenders", "stats", scope ?? null] as const,
    /** Keyed by the sorted product ids on screen, so two searches that happen
     *  to show the same products share one cache entry. */
    memberships: (productIds: number[]) =>
      ["tenders", "memberships", productIds.join(",")] as const,
  },
};

/** Drop empty values so they never reach the URL as `?q=&page=1`.
 *
 *  An array value is expanded into a repeated parameter (`?doc_type=coa&
 *  doc_type=msds`), which is what FastAPI reads back as a `list[...]` query.
 *  An empty array contributes nothing, so "no type filter" and "every type
 *  ticked off" both mean unfiltered. */
function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        search.append(key, String(item));
      }
      continue;
    }
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

/** The growth chart and the tile sparklines. Its own query, not a field on
 *  `useDashboard`, so moving the range selector refetches only the lines — the
 *  counts and breakdowns beside them stay on their cached key. */
export function useDashboardTimeseries(windowDays: number) {
  return useQuery({
    queryKey: keys.dashboardTimeseries(windowDays),
    queryFn: () =>
      apiFetch<DashboardTimeseries>(
        `/dashboard/timeseries?window_days=${windowDays}`,
      ),
    // Keep the old lines on screen while a new range loads, so switching
    // 30d → 90d redraws rather than blanking the card.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: keys.countries,
    queryFn: () => apiFetch<CountryRef[]>("/lookups/countries"),
    staleTime: 60 * 60 * 1000, // reference data; effectively static
  });
}

/** The therapeutic axis, for the product form's class picker. Reference data,
 *  so it is cached hard. */
export function useTherapeuticCategories() {
  return useQuery({
    queryKey: keys.therapeuticCategories,
    queryFn: () =>
      apiFetch<TherapeuticCategoryRef[]>("/lookups/therapeutic-categories"),
    staleTime: 60 * 60 * 1000,
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

export function useCompanyStats() {
  return useQuery({
    queryKey: keys.companies.stats,
    queryFn: () => apiFetch<CompanyStats>("/companies/stats"),
  });
}

export function useContacts(params: ContactListParams) {
  return useQuery({
    queryKey: keys.contacts.list(params),
    queryFn: () =>
      apiFetch<Page<ContactListItem>>(`/contacts${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useContact(id: number | null) {
  return useQuery({
    queryKey: keys.contacts.detail(id ?? 0),
    queryFn: () => apiFetch<ContactDetail>(`/contacts/${id}`),
    enabled: id !== null,
  });
}

export function useContactStats() {
  return useQuery({
    queryKey: keys.contacts.stats,
    queryFn: () => apiFetch<ContactStats>("/contacts/stats"),
  });
}

/** Options for the Role/Department filter — only values a contact actually
 *  has, not a hard-coded list. */
export function useContactDepartments() {
  return useQuery({
    queryKey: keys.contacts.departments,
    queryFn: () => apiFetch<string[]>("/contacts/departments"),
  });
}

export function useContactActivity(id: number | null) {
  return useQuery({
    queryKey: keys.contacts.activity(id ?? 0),
    queryFn: () => apiFetch<ContactActivityEntry[]>(`/contacts/${id}/activity`),
    enabled: id !== null,
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

/** One product in full — synonyms, molecular formula, packaging spec. Fetched
 *  only when a row is actually opened, so a 50-row page costs nothing extra. */
export function useProduct(id: number | null) {
  return useQuery({
    queryKey: keys.products.detail(id ?? 0),
    queryFn: () => apiFetch<ProductDetail>(`/products/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

/** Who sells this product, with each supplier's best contact route resolved
 *  server-side. Fetched only when a product is actually opened. */
export function useProductSuppliers(id: number | null) {
  return useQuery({
    queryKey: keys.products.suppliers(id ?? 0),
    queryFn: () => apiFetch<ProductSuppliers>(`/products/${id}/suppliers`),
    enabled: id !== null && Number.isFinite(id),
  });
}

/** Header tile counts. Kept out of the list key on purpose: the tiles describe
 *  the whole catalogue, so they must not refetch when a filter narrows the
 *  table beneath them. */
export function useProductStats() {
  return useQuery({
    queryKey: keys.products.stats,
    queryFn: () => apiFetch<ProductStats>("/products/stats"),
    staleTime: 5 * 60_000,
  });
}

/* --- Document library (FR-DOC) ------------------------------------------ */

export function useDocuments(params: DocumentListParams) {
  return useQuery({
    queryKey: keys.documents.list(params),
    queryFn: () =>
      apiFetch<Page<DocumentItem>>(`/documents${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

/** Header counts. Kept out of the list key on purpose: the strip describes the
 *  whole library, so it must not refetch when a filter narrows the table. */
export function useDocumentStats() {
  return useQuery({
    queryKey: keys.documents.stats,
    queryFn: () => apiFetch<DocumentStats>("/documents/stats"),
    staleTime: 5 * 60_000,
  });
}

/**
 * Upload one file.
 *
 * One request per file rather than one for the batch: a drag-and-drop of eight
 * certificates should not lose seven of them because the third was a .doc, and
 * per-file requests are what let the UI report progress and failure per row.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      docType,
      title,
      notes,
      target,
      targetId,
    }: {
      file: File;
      docType: DocType;
      title?: string;
      notes?: string;
      target?: DocumentTarget;
      targetId?: number;
    }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("doc_type", docType);
      if (title) form.append("title", title);
      if (notes) form.append("notes", notes);
      if (target && targetId) {
        form.append("target", target);
        form.append("target_id", String(targetId));
      }
      // No content-type header: only the browser can write the multipart
      // boundary, and setting it by hand produces a body FastAPI cannot parse.
      return apiFetch<DocumentUploadResult>("/documents", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
    },
  });
}

/**
 * "Add to Documents" on an inbox attachment.
 *
 * Separate from `useUploadDocument` because the bytes never touch the browser:
 * the server pulls them from Gmail and stores them, so this posts metadata
 * rather than a file. That also means a 30 MB attachment is saved without being
 * downloaded and re-uploaded across the user's connection.
 */
export function useSaveInboxAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      partId,
      docType,
      title,
      notes,
      target,
      targetId,
    }: {
      messageId: string;
      partId: string;
      docType: DocType;
      title?: string;
      notes?: string;
      target?: DocumentTarget;
      targetId?: number;
    }) =>
      apiFetch<DocumentUploadResult>(
        `/mailbox/inbox/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(partId)}/save`,
        {
          method: "POST",
          json: {
            doc_type: docType,
            title,
            notes,
            target: targetId ? target : undefined,
            target_id: targetId,
          },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
    },
  });
}

/**
 * "Add to Documents" on a *synced* attachment — the sourcing conversation's
 * version of `useSaveInboxAttachment`.
 *
 * Different endpoint because the two have different starting points: an inbox
 * attachment is addressed by Gmail message and MIME part (nothing about it is
 * stored), while a synced one already has a `mail_attachment` row and an id.
 * Both keep the bytes on the server side of the connection.
 *
 * Invalidates sourcing as well as documents: the enquiry's Documents tab is
 * reading the library, so a save has to show up there without a reload.
 */
export function useSaveMailAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attachmentId,
      docType,
      title,
      notes,
      target,
      targetId,
    }: {
      attachmentId: number;
      docType: DocType;
      title?: string;
      notes?: string;
      target?: DocumentTarget;
      targetId?: number;
    }) =>
      apiFetch<DocumentUploadResult>(
        `/mailbox/attachments/${attachmentId}/save`,
        {
          method: "POST",
          json: {
            doc_type: docType,
            title,
            notes,
            target: targetId ? target : undefined,
            target_id: targetId,
          },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      title?: string;
      doc_type?: DocType;
      notes?: string;
    }) =>
      apiFetch<DocumentItem>(`/documents/${id}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ detail: string }>(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
    },
  });
}

export function useLinkDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      target,
      targetId,
    }: {
      id: number;
      target: DocumentTarget;
      targetId: number;
    }) =>
      apiFetch<DocumentItem>(`/documents/${id}/links`, {
        method: "POST",
        json: { target, target_id: targetId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
    },
  });
}

export function useUnlinkDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, linkId }: { id: number; linkId: number }) =>
      apiFetch<DocumentItem>(`/documents/${id}/links/${linkId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.documents.all });
    },
  });
}

/** Download a library document.
 *
 *  Goes through `apiFetch` rather than a plain `<a href>` because the file
 *  endpoint is behind the auth check (FR-DOC-05) and a bare link sends no
 *  Authorization header — it would render the login redirect as a corrupt
 *  file. The blob URL is revoked on the next tick; holding it would pin the
 *  whole file in memory for the life of the tab. */
export async function downloadDocument(id: number, filename: string) {
  const file = await apiFetch<Blob>(`/documents/${id}/file?download=true`, {
    blob: true,
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A blob URL for previewing a document inline (FR-DOC-07), with the media
 *  type the server actually served.
 *
 *  The type is returned rather than read off the document row because they can
 *  differ: the preview branch transcodes an image no browser decodes — a HEIC
 *  off a phone, a TIFF scan — to JPEG, while the row still records what was
 *  filed. Rendering against the stored type would put a `image/heic` label on
 *  JPEG bytes, which is how you get an empty frame.
 *
 *  The caller owns the URL and must revoke it when the preview closes — an
 *  un-revoked object URL keeps the file in memory until the tab is closed. */
export async function documentPreviewUrl(
  id: number,
  updatedAt: string,
): Promise<{ url: string; mime: string }> {
  // `v` is ignored by the API and exists only to key the browser's HTTP cache.
  // The endpoint now sends `must-revalidate`, so a fresh cache entry can never
  // go stale on its own — but entries made *before* that header existed are
  // still governed by the heuristic freshness they were stored with, and a
  // document whose stored rendition changed underneath it (the WebP backfill)
  // would keep being answered from one. `updated_at` moves whenever the row
  // does, which is the only thing that also moves when the file does.
  const file = await apiFetch<Blob>(
    `/documents/${id}/file?v=${encodeURIComponent(updatedAt)}`,
    { blob: true },
  );
  return { url: URL.createObjectURL(file), mime: file.type };
}

/** Preview loaders for mail attachments.
 *
 *  Same bytes the download buttons fetch — the difference is only what is done
 *  with them. A `blob:` URL sidesteps the endpoint's
 *  `Content-Disposition: attachment`, which exists to stop the browser
 *  rendering a supplier's HTML on our origin; `FilePreview` re-imposes that
 *  protection by refusing to render anything but PDFs and raster images.
 *
 *  The caller owns the URL and must revoke it when the preview closes. */
export async function mailAttachmentPreviewUrl(
  attachmentId: number,
): Promise<{ url: string; mime: string }> {
  const file = await apiFetch<Blob>(
    `/mailbox/attachments/${attachmentId}/download`,
    { blob: true },
  );
  return { url: URL.createObjectURL(file), mime: file.type };
}

export async function inboxAttachmentPreviewUrl(
  messageId: string,
  partId: string,
): Promise<{ url: string; mime: string }> {
  const file = await apiFetch<Blob>(
    `/mailbox/inbox/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(partId)}/download`,
    { blob: true },
  );
  return { url: URL.createObjectURL(file), mime: file.type };
}

/* --- Sourcing (FR-SRC) -------------------------------------------------- */

/**
 * How often a sourcing query re-checks the server, in ms.
 *
 * `refetchIntervalInBackground` is left off deliberately, so a tab left open
 * on this screen overnight stops asking once it is hidden. This only refreshes
 * what the *server* already holds — reaching out to Gmail is `useSyncMailbox`.
 */
export type PollOptions = { refetchInterval?: number };

export function useSourcingRequests(
  params: SourcingRequestParams,
  options: PollOptions = {},
) {
  return useQuery({
    queryKey: keys.sourcing.list(params),
    queryFn: () =>
      apiFetch<Page<SourcingRequestListItem>>(
        `/sourcing/requests${toQueryString(params)}`,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: options.refetchInterval,
  });
}

/** One request with its timeline, communications and quotations. `null`
 *  disables the query, so the detail panel can mount before a row is picked. */
export function useSourcingRequest(id: number | null) {
  return useQuery({
    queryKey: keys.sourcing.detail(id ?? 0),
    queryFn: () => apiFetch<SourcingRequestDetail>(`/sourcing/requests/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

/** Counts per pipeline column. Kept out of the list key: the board describes
 *  the whole pipeline and must not shrink when a filter narrows the table. */
export function useSourcingPipeline(options: PollOptions = {}) {
  return useQuery({
    queryKey: keys.sourcing.pipeline,
    queryFn: () => apiFetch<SourcingPipeline>("/sourcing/pipeline"),
    refetchInterval: options.refetchInterval,
  });
}

export function useCreateSourcingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SourcingRequestCreateInput) =>
      apiFetch<SourcingRequestDetail>("/sourcing/requests", {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

export function useUpdateSourcingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: SourcingRequestUpdateInput & { id: number }) =>
      apiFetch<SourcingRequestDetail>(`/sourcing/requests/${id}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

/**
 * Move a request along the pipeline.
 *
 * Its own endpoint rather than a PATCH field: a transition writes a history row
 * and can stamp `sent_at` or `first_replied_at`, so it must not be reachable by
 * a form that happens to include `status` in its body.
 */
export function useChangeSourcingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      to_status,
      note,
    }: {
      id: number;
      to_status: SourcingStatus;
      note?: string;
    }) =>
      apiFetch<SourcingRequestDetail>(`/sourcing/requests/${id}/status`, {
        method: "POST",
        json: { to_status, note },
      }),
    onSuccess: () => {
      // The board counts move with the row, so the whole subtree refreshes.
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

export function useDeleteSourcingRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) =>
      apiFetch(`/sourcing/requests/${requestId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

/** Log one exchange. An inbound message on a request that is still awaiting a
 *  reply advances it server-side, so this refreshes the board too. */
export function useLogCommunication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CommunicationCreateInput) =>
      apiFetch<Communication>("/sourcing/communications", {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
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

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contactId: number) =>
      apiFetch(`/contacts/${contactId}`, { method: "DELETE" }),
    onSuccess: () => {
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

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: number) =>
      apiFetch(`/companies/${companyId}`, { method: "DELETE" }),
    onSuccess: () => {
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: ProductUpdateInput & { id: number }) =>
      apiFetch(`/products/${id}`, { method: "PATCH", json: payload }),
    onSuccess: () => {
      // `products.all` covers the list, the detail, and the header tiles —
      // renaming a product or clearing its CAS changes every one of them.
      queryClient.invalidateQueries({ queryKey: keys.products.all });
      // Search results embed the product name and CAS too.
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
  });
}

/** Soft-deletes one product (backend keeps the row, tombstoned by
 *  `deleted_at`). Used both for the row menu's single delete and, called
 *  once per id, the products table's bulk delete. */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.products.all });
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
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

/** The five board tiles — total plus each display bucket, each with its own
 *  30-day trend. `scope: "mine"` narrows every bucket to the caller's own
 *  tenders, matching the My Tenders tab. */
export function useTenderStats(scope?: "mine") {
  return useQuery({
    queryKey: keys.tenders.stats(scope),
    queryFn: () =>
      apiFetch<TenderStats>(`/tenders/stats${toQueryString({ scope })}`),
    placeholderData: keepPreviousData,
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
export function useAddTenderShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenderId,
      ...payload
    }: TenderShortlistInput & { tenderId: number }) =>
      apiFetch(`/tenders/${tenderId}/shortlist`, { method: "POST", json: payload }),
    onSuccess: () => {
      // Both the membership ticks on the search page and the tender's own
      // item counts move together.
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

export function useRemoveTenderShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenderId, itemId }: { tenderId: number; itemId: number }) =>
      apiFetch(`/tenders/${tenderId}/shortlist/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

export function useDeleteTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenderId: number) =>
      apiFetch(`/tenders/${tenderId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

/** The append-only audit trail (FR-ADM-02), scoped to tenders/tender
 *  items/sourcing/quotations server-side — see `ActivityFeedService`. Callers
 *  that want "this tender's activity" filter client-side on `entry.href`,
 *  since the feed has no per-entity filter of its own yet. */
export function useRecentActivity(limit = 8) {
  return useQuery({
    queryKey: keys.activity(limit),
    queryFn: () => apiFetch<ActivityEntry[]>(`/activity?limit=${limit}`),
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

/** Hand a checked batch to an owner for approval. Staff and owner only —
 *  the API refuses a viewer, and the UI hides the button for them. */
export function useSubmitImport(batchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ImportBatch>(`/imports/batches/${batchId}/submit`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.all });
    },
  });
}

/** Pull a batch back out of the approval queue to keep working on it. */
export function useWithdrawImport(batchId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ImportBatch>(`/imports/batches/${batchId}/withdraw`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.imports.all });
    },
  });
}

/* -------------------------------------------------------------------------
 * Account settings (SRS FR-AUTH extension, 2026-08-22)
 * ---------------------------------------------------------------------- */

export function useUpdateProfile() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (full_name: string) =>
      apiFetch<AuthUser>("/auth/me", { method: "PATCH", json: { full_name } }),
    onSuccess: (user) => updateUser(user),
  });
}

export function useUploadAvatar() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return apiFetch<AuthUser>("/auth/me/avatar", { method: "PUT", body: form });
    },
    onSuccess: (user) => updateUser(user),
  });
}

export function useRemoveAvatar() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: () => apiFetch<AuthUser>("/auth/me/avatar", { method: "DELETE" }),
    onSuccess: (user) => updateUser(user),
  });
}

export function useUpdateNotificationPreferences() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (payload: {
      notify_follow_up_due: boolean;
      notify_quotation_received: boolean;
    }) => apiFetch<AuthUser>("/auth/me/notifications", { method: "PATCH", json: payload }),
    onSuccess: (user) => updateUser(user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      apiFetch<{ detail: string }>("/auth/change-password", {
        method: "POST",
        json: payload,
      }),
  });
}

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: () => apiFetch<TwoFactorSetup>("/auth/2fa/setup", { method: "POST" }),
  });
}

export function useConfirmTwoFactor() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<RecoveryCodes>("/auth/2fa/confirm", { method: "POST", json: { code } }),
    onSuccess: () => updateUser({ two_factor_enabled: true }),
  });
}

export function useDisableTwoFactor() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (current_password: string) =>
      apiFetch<{ detail: string }>("/auth/2fa/disable", {
        method: "POST",
        json: { current_password },
      }),
    onSuccess: () => updateUser({ two_factor_enabled: false }),
  });
}

export function useSessions() {
  return useQuery({
    queryKey: keys.account.sessions,
    queryFn: () => apiFetch<AccountSession[]>("/auth/sessions"),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: number) =>
      apiFetch<{ detail: string }>(`/auth/sessions/${sessionId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.account.sessions }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ detail: string }>("/auth/sessions", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.account.sessions }),
  });
}

/* -------------------------------------------------------------------------
 * Admin: user management + audit trail (SRS FR-ADM extension, 2026-08-23)
 * ---------------------------------------------------------------------- */

export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: keys.admin.users(params),
    queryFn: () => apiFetch<Page<AdminUser>>(`/users${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserInput) =>
      apiFetch<CreateUserResult>("/users", { method: "POST", json: payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      apiFetch<AdminUser>(`/users/${userId}/role`, { method: "PATCH", json: { role } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiFetch<AdminUser>(`/users/${userId}/suspend`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiFetch<AdminUser>(`/users/${userId}/reactivate`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) =>
      apiFetch<{ detail: string }>(`/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useActivityLog(params: AuditLogParams) {
  return useQuery({
    queryKey: keys.admin.activityLog(params),
    queryFn: () =>
      apiFetch<Page<AuditLogEntry>>(`/activity/log${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

// --- Supplier mail (Gmail) ---------------------------------------------------
//
// Separate from the Resend path behind invites and password resets: this is
// mail sent as a person, from the client's own address, that expects a reply.
//
// The recurring theme in these hooks is that `needs_reauth` is normal. The
// mailbox is a consumer @gmail.com on a Testing-mode OAuth app, so the grant
// expires every 7 days. The backend answers a dead grant with 409
// `mailbox_reauth_required` rather than 401 — a 401 would send the auth layer
// to the login screen for a problem that has nothing to do with the user's
// own session.

/** State of the supplier mailbox. Any authenticated user may read it, because
 *  every Send button needs to know whether it should be enabled. */
export function useMailboxSettings() {
  return useQuery({
    queryKey: keys.mailbox.settings,
    queryFn: () => apiFetch<MailboxSettings>("/mailbox/settings"),
  });
}

/** True when an error is the mailbox grant expiring rather than a real fault —
 *  what the Reconnect banner keys off. */
export function isMailboxReauthError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    (error.detail as { code?: string } | undefined)?.code ===
      "mailbox_reauth_required"
  );
}

/** Start the Google consent flow. Returns a URL rather than redirecting,
 *  because a 307 to accounts.google.com would be followed by fetch and fail
 *  CORS instead of moving the browser. Owner only. */
export function useConnectMailbox() {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ authorization_url: string }>("/mailbox/connect", {
        method: "POST",
      }),
    onSuccess: (data) => {
      window.location.href = data.authorization_url;
    },
    onError: (error) => {
      // The server refuses up front on a misconfiguration — no client id, or
      // a MAILBOX_TOKEN_KEY that cannot be loaded. Without this the button
      // just went quiet, and the next thing the admin saw was nothing at all.
      toast.error(
        error instanceof ApiError ? error.message : "Could not start the Google sign-in",
        { duration: 10000 },
      );
    },
  });
}

/** Revoke the grant at Google. Synced messages are kept — the conversations
 *  happened, and dropping them would take the sourcing history with them. */
export function useDisconnectMailbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/mailbox/disconnect", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
    },
  });
}

/** The sender name suppliers see. Owner only. */
export function useUpdateMailboxName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string | null) =>
      apiFetch("/mailbox/account", {
        method: "PATCH",
        json: { display_name: displayName },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
    },
  });
}

/** The email conversation on one sourcing request. */
export function useRequestThread(requestId: number | null) {
  return useQuery({
    queryKey: keys.mailbox.thread(requestId ?? 0),
    queryFn: () => apiFetch<MailThread>(`/mailbox/requests/${requestId}/thread`),
    enabled: requestId !== null && Number.isFinite(requestId),
  });
}

/** The pre-filled inquiry. `enabled` is the caller's switch so the draft is
 *  only built when the compose dialog actually opens — it is a server-side
 *  render over the request, not something to prefetch for every row. */
/** The email an enquiry *would* send, rendered before the request is filed.
 *
 *  One per supplier, because each has its own greeting and address. Keyed on
 *  the whole input, so re-ticking a checklist box the buyer had just unticked
 *  comes back from cache instead of re-rendering server-side — the preview
 *  should feel like it is following his cursor.
 *
 *  `staleTime: Infinity` is safe here: the key already contains every input
 *  the body is derived from, so nothing can go stale without becoming a
 *  different key. */
export function useInquiryPreviews(
  inputs: InquiryPreviewInput[],
  enabled: boolean,
) {
  return useQueries({
    queries: inputs.map((input) => ({
      queryKey: keys.mailbox.preview(input),
      queryFn: () =>
        apiFetch<InquiryDraft>("/mailbox/inquiry-preview", {
          method: "POST",
          json: input,
        }),
      enabled,
      staleTime: Infinity,
      placeholderData: keepPreviousData,
    })),
  });
}

/**
 * Send an inquiry, for a request whose id is only known at call time.
 *
 * Not bound to one request per hook, because the enquiry dialog cannot be:
 * from a tender it files N sourcing requests and then mails each one, and the
 * ids do not exist until the mutation that created them has resolved.
 *
 * Invalidates sourcing as well as mail — sending moves a draft request to
 * `sent` server-side, and the board has to follow.
 */
export function useSendInquiryById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      requestId,
      payload,
    }: {
      requestId: number;
      payload: MailSendInput;
    }) =>
      apiFetch<MailMessage>(`/mailbox/requests/${requestId}/send`, {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

/** Refresh one request's threads — what the detail panel calls on open. A full
 *  sync walks every inquiry ever sent; opening one request should not pay for
 *  that. */
export function useSyncRequestMail(requestId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<MailSyncResult>(`/mailbox/requests/${requestId}/sync`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

/** Pull new replies across every thread the system started. */
export function useSyncMailbox() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<MailSyncResult>("/mailbox/sync", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
    },
  });
}

/** Download an attachment.
 *
 *  Goes through fetch rather than a plain <a href> because the endpoint needs
 *  the Authorization header — a bare link would arrive unauthenticated and
 *  404. The blob URL is revoked on the next tick; holding it would pin the
 *  whole file in memory for the life of the tab. */
export async function downloadMailAttachment(
  attachmentId: number,
  filename: string,
) {
  const file = await apiFetch<Blob>(
    `/mailbox/attachments/${attachmentId}/download`,
    { blob: true },
  );
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// --- Tender notices ---------------------------------------------------------
//
// The pipeline: upload → extract → review + map → confirm. Nothing promotes
// itself; `useConfirmNotice` is a deliberate act, because a reference number
// misread off a scan is a lost bid.

/** The notice inbox. */
export function useTenderNotices(params: TenderNoticeParams) {
  return useQuery({
    queryKey: keys.tenderNotices.list(params),
    queryFn: () =>
      apiFetch<Page<TenderNoticeListItem>>(
        `/tender-notices${toQueryString(params)}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/** One notice with every tender and requirement line — the review screen's
 *  whole payload, deliberately in a single request. */
export function useTenderNotice(id: number | null) {
  return useQuery({
    queryKey: keys.tenderNotices.detail(id ?? 0),
    queryFn: () => apiFetch<TenderNoticeDetail>(`/tender-notices/${id}`),
    enabled: id !== null && Number.isFinite(id),
  });
}

/** The stored notice document, as a Blob.
 *
 *  Fetched rather than linked. The endpoint authenticates on the
 *  `Authorization` header, so a bare `<a href>` or `<iframe src>` arrives
 *  without one and 401s — the same trap `downloadMailAttachment` documents.
 *  The caller turns this into an object URL and revokes it on unmount. */
export function useNoticeDocument(noticeId: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.noticeDocument(noticeId),
    queryFn: () =>
      apiFetch<Blob>(`/tender-notices/${noticeId}/document`, { blob: true }),
    enabled,
    // The bytes behind a notice id are immutable — re-uploading the same
    // document is deduped server-side into the same notice.
    staleTime: Infinity,
  });
}

export function useNoticeSources() {
  return useQuery({
    queryKey: keys.tenderNotices.sources,
    queryFn: () => apiFetch<NoticeSource[]>("/tender-notices/sources"),
  });
}

/** Set when — and whether — a source is scraped (Settings → Scraping Scheduler).
 *
 *  Saving arms the schedule server-side rather than leaving the slot due, so
 *  moving the time to something earlier in the day does not fire a scrape the
 *  moment the button is pressed. Use `useFetchNoticeSource` to run one now. */
export function useUpdateNoticeSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceId,
      ...body
    }: NoticeScheduleUpdate & { sourceId: number }) =>
      apiFetch<NoticeSource>(`/tender-notices/sources/${sourceId}/schedule`, {
        method: "PATCH",
        json: body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.sources });
    },
  });
}

/** Re-run one source's fetcher now.
 *
 *  Fetching is scheduled, not driven from this screen — the point of the
 *  feature is that nobody has to remember to look. This is the retry behind
 *  the "fetch failed" notification: being told something broke is only useful
 *  next to a way to try it again once it is fixed. */
export function useFetchNoticeSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: number) =>
      apiFetch<NoticeFetchReport>(`/tender-notices/sources/${sourceId}/fetch`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
      // A fetch that imported anything also raised a notification, and the
      // tray is stale until this lands.
      queryClient.invalidateQueries({ queryKey: keys.notifications.all });
    },
  });
}

/** Capture a notice document. Multipart, because the PDF is the point. */
export function useUploadNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      file: File;
      title?: string;
      source_name?: string;
      source_url?: string;
      notice_date?: string;
    }) => {
      const form = new FormData();
      form.append("file", input.file);
      if (input.title) form.append("title", input.title);
      if (input.source_name) form.append("source_name", input.source_name);
      if (input.source_url) form.append("source_url", input.source_url);
      if (input.notice_date) form.append("notice_date", input.notice_date);
      // No content-type header: only the browser can generate the multipart
      // boundary, and setting it by hand produces a request FastAPI cannot parse.
      return apiFetch<TenderNoticeDetail>("/tender-notices", {
        method: "POST",
        body: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Read the document into draft tenders and suggest product matches.
 *
 *  Re-running REPLACES the previous run's tenders, confirmed mappings
 *  included — a re-extraction means the first reading was wrong, and merging
 *  two readings of one page leaves a hybrid nobody can check against the PDF. */
/** Correct the notice's own fields — the title above all, since it defaults to
 *  the uploaded filename. */
export function useUpdateNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      noticeId,
      ...payload
    }: {
      noticeId: number;
      title?: string;
      source_name?: string | null;
      source_url?: string | null;
      notice_date?: string | null;
      notes?: string | null;
    }) =>
      apiFetch<TenderNoticeDetail>(`/tender-notices/${noticeId}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** The same extraction as `useExtractNotice`, with the notice id supplied at
 *  call time rather than when the hook is built — the upload flow only learns
 *  the id from the response it is chaining off. */
export function useExtractNoticeById() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noticeId: number) =>
      apiFetch<ExtractionResult>(`/tender-notices/${noticeId}/extract`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

export function useExtractNotice(noticeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ExtractionResult>(`/tender-notices/${noticeId}/extract`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Promote the reviewed tenders onto the live tender board. */
export function useConfirmNotice(noticeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<NoticeConfirmResult>(`/tender-notices/${noticeId}/confirm`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noticeId: number) =>
      apiFetch(`/tender-notices/${noticeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Alternative products for one line — the "Choose Another" list. */
export function useItemCandidates(itemId: number | null) {
  return useQuery({
    queryKey: keys.tenderNotices.candidates(itemId ?? 0),
    queryFn: () =>
      apiFetch<MatchCandidate[]>(
        `/tender-notices/items/${itemId}/candidates?limit=8`,
      ),
    enabled: itemId !== null && Number.isFinite(itemId),
  });
}

/** Settle one line: confirm a product, or skip it. The only path that writes
 *  `confirmed`. */
export function useMapItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: TenderItemMappingInput & { itemId: number }) =>
      apiFetch<NoticeTenderItem>(`/tender-notices/items/${itemId}/mapping`, {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** One-click confirm of whatever the matcher proposed. */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      apiFetch<NoticeTenderItem>(`/tender-notices/items/${itemId}/accept`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** "Map All & Continue" — confirms every *suggested* line on one tender and
 *  leaves settled ones alone. */
export function useAcceptAllSuggestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenderId: number) =>
      apiFetch<{ detail: string }>(
        `/tender-notices/tenders/${tenderId}/accept-suggestions`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Take ONE tender back off the live board.
 *
 *  The inverse of `useConfirmTender`: the tender becomes the notice's draft
 *  reading again and disappears from the tender board, while its shortlisted
 *  suppliers are kept — re-confirming tops them up rather than rebuilding
 *  them. Invalidates the board as well as the notice, since a row leaves it. */
export function useUnpublishTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenderId: number) =>
      apiFetch<{ detail: string }>(
        `/tender-notices/tenders/${tenderId}/unpublish`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

/** Re-run matching over unsettled lines, after the catalogue has changed. */
export function useRematchTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenderId: number) =>
      apiFetch<{ detail: string }>(`/tender-notices/tenders/${tenderId}/rematch`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Add a requirement line the extractor missed. Matched on creation. */
export function useAddNoticeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenderId,
      ...payload
    }: { tenderId: number; raw_name: string; specification?: string }) =>
      apiFetch<NoticeTenderItem>(`/tender-notices/tenders/${tenderId}/items`, {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Correct a misread line. Changing the name re-runs matching unless the line
 *  is already confirmed. */
export function useUpdateNoticeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: { itemId: number; raw_name?: string; specification?: string | null }) =>
      apiFetch<NoticeTenderItem>(`/tender-notices/items/${itemId}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

export function useDeleteNoticeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      apiFetch(`/tender-notices/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Correct tender-level fields the extractor got wrong. */
export function useUpdateNoticeTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tenderId,
      ...payload
    }: NoticeTenderUpdateInput & { tenderId: number }) =>
      apiFetch<NoticeTender>(`/tender-notices/tenders/${tenderId}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Tick exactly these suppliers on one line; untick the rest.
 *
 *  Sends the whole selection rather than a delta, so the call is idempotent
 *  and two reviewers on one line do not depend on arrival order. */
export function useSetItemSuppliers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      supplierProductIds,
    }: {
      itemId: number;
      supplierProductIds: number[];
    }) =>
      apiFetch<NoticeTenderItem>(`/tender-notices/items/${itemId}/suppliers`, {
        method: "POST",
        json: { supplier_product_ids: supplierProductIds },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
    },
  });
}

/** Promote ONE tender and shortlist its ticked suppliers.
 *
 *  Separate from the notice-wide confirm because a notice's tenders are
 *  reviewed at different speeds — two can be ready to bid on while the rest
 *  still need mapping. */
export function useConfirmTender() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenderId: number) =>
      apiFetch<TenderConfirmResult>(
        `/tender-notices/tenders/${tenderId}/confirm`,
        { method: "POST" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.tenderNotices.all });
      queryClient.invalidateQueries({ queryKey: keys.tenders.all });
    },
  });
}

/* -------------------------------------------------------------------------
 * Notifications
 * ---------------------------------------------------------------------- */

/**
 * The bell's list. Kept on a short `staleTime` rather than a poll: the live
 * stream invalidates this key the moment anything lands, so polling it would
 * be a second, slower copy of a job already done.
 */
export function useNotifications(page: number, unreadOnly = false) {
  return useQuery({
    queryKey: keys.notifications.list(page, unreadOnly),
    queryFn: () =>
      apiFetch<Page<AppNotification>>(
        `/notifications?page=${page}&size=20${unreadOnly ? "&unread_only=true" : ""}`,
      ),
    placeholderData: keepPreviousData,
  });
}

/**
 * The notification history. The bell starts with the newest page, then lets
 * the user explicitly pull older pages into the same scrollable timeline.
 */
export function useInfiniteNotifications(unreadOnly = false) {
  return useInfiniteQuery({
    queryKey: ["notifications", "history", unreadOnly] as const,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiFetch<Page<AppNotification>>(
        `/notifications?page=${pageParam}&size=20${unreadOnly ? "&unread_only=true" : ""}`,
      ),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
  });
}

/** The badge. Its own endpoint so opening the tray is not a prerequisite for
 *  knowing there is something in it. */
export function useUnreadCount() {
  return useQuery({
    queryKey: keys.notifications.unread,
    queryFn: () => apiFetch<UnreadCount>("/notifications/unread-count"),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<AppNotification>(`/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<MarkAllReadResult>("/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.all });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<DeleteAllNotificationsResult>("/notifications", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.notifications.all });
    },
  });
}

// --- Inbox (2026-08-31) ------------------------------------------------------
//
// The mailbox module gained a real inbox: the client can now read mail that
// arrived without the ERP starting the conversation, and send an email that
// belongs to no tender and no sourcing request. Both were the gap he named —
// until now every send began at a product or a tender, and a supplier who
// wrote first was invisible.
//
// Two properties shape every hook below:
//
//   * **Nothing is cached server-side and nothing is stored.** A page is
//     fetched from Gmail, classified, rendered, and forgotten. So these
//     queries have a short `staleTime` and no optimistic writes — there is no
//     local copy of the truth to update.
//   * **The filter is logic the user owns.** `useSetSenderRule` is the
//     learning loop that stands in for an AI classifier, and every mutation of
//     it invalidates the whole inbox, because one rule can re-sort every
//     message on screen.

/** One page of the inbox, already sorted into a bucket by the server.
 *
 *  `pageToken` is Gmail's own cursor, passed straight back. A page can come
 *  back with fewer rows than asked for while still carrying a token: the
 *  server walks a scan budget looking for messages of the requested bucket and
 *  stops when it runs out, which is a "load more", not an end. */
/** Everything this system has emailed, newest first.
 *
 *  The one mailbox query that touches no Google API: it reads the
 *  `communication` rows every send path already writes. So unlike `useInbox`
 *  it has an ordinary staleTime, pages by number rather than by an opaque
 *  provider token, and keeps working while the weekly Gmail grant is expired —
 *  which is exactly when "what did I send that supplier?" gets asked.
 */
export function useSentMail(params: SentMailParams) {
  return useQuery({
    queryKey: keys.mailbox.sent(params),
    queryFn: () =>
      apiFetch<Page<SentMessage>>(`/mailbox/sent${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useInbox(
  bucket: InboxBucket,
  pageToken?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: keys.mailbox.inbox(bucket, pageToken ?? null),
    queryFn: () =>
      apiFetch<InboxPage>(
        `/mailbox/inbox${toQueryString({
          bucket,
          page_token: pageToken ?? undefined,
        })}`,
      ),
    // Short but non-zero: switching tabs back and forth should not re-spend
    // Gmail calls, and the mailbox does not change in the seconds it takes to
    // look at two tabs.
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** One conversation, read live from Gmail. Opening it stores nothing. */
export function useInboxThread(threadId: string | null) {
  return useQuery({
    queryKey: keys.mailbox.inboxThread(threadId ?? ""),
    queryFn: () =>
      apiFetch<InboxThread>(`/mailbox/inbox/threads/${threadId}`),
    enabled: Boolean(threadId),
    staleTime: 30_000,
  });
}

/** Send an email that belongs to no tender and no sourcing request.
 *
 *  Invalidates sourcing as well as the mailbox: if the recipient turned out to
 *  be an address already on file, the message has just landed on that
 *  supplier's timeline. */
export function useSendDirectMail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DirectSendInput) =>
      apiFetch<MailMessage>("/mailbox/inbox/send", {
        method: "POST",
        json: input,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
      // A direct send can also be a mail to a contact — sent from their detail
      // panel — and the Contacts stat cards count the same rows.
      queryClient.invalidateQueries({ queryKey: keys.contacts.all });
    },
  });
}

/** Keep a conversation the ERP did not start.
 *
 *  The deliberate act that turns "read and forgotten" into a record. After
 *  this the ordinary sync picks up later replies, because the thread id is now
 *  one the system knows. */
export function useFileInboxThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      threadId,
      companyId,
    }: {
      threadId: string;
      companyId?: number | null;
    }) =>
      apiFetch<ThreadFiled>(`/mailbox/inbox/threads/${threadId}/file`, {
        method: "POST",
        json: { company_id: companyId ?? null },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      queryClient.invalidateQueries({ queryKey: keys.sourcing.all });
      toast.success(
        result.messages_recorded > 0
          ? `Filed ${result.messages_recorded} message${result.messages_recorded === 1 ? "" : "s"}.`
          : "This conversation was already on file.",
      );
    },
  });
}

/** Every triage decision made so far — the filter's whole memory. */
export function useSenderRules() {
  return useQuery({
    queryKey: keys.mailbox.senderRules,
    queryFn: () => apiFetch<SenderRule[]>("/mailbox/sender-rules"),
  });
}

/** Mark a sender as business, or as not.
 *
 *  PUT because it upserts on the pattern: pressing the opposite button flips
 *  the verdict rather than filing a second row that contradicts the first.
 *  Invalidates the whole mailbox, because one rule re-sorts every message from
 *  that sender currently on screen. */
export function useSetSenderRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SenderRuleInput) =>
      apiFetch<SenderRule>("/mailbox/sender-rules", {
        method: "PUT",
        json: input,
      }),
    onSuccess: (rule) => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
      toast.success(
        rule.is_business
          ? `${rule.pattern} will show under Business.`
          : `${rule.pattern} will be filtered out.`,
      );
    },
    onError: (error) => {
      // The freemail guard lands here: allowing a whole-domain rule on
      // gmail.com or qq.com would allowlist every user of that provider, so
      // the server refuses and explains. Worth showing verbatim.
      toast.error(
        error instanceof ApiError ? error.message : "Could not save that rule.",
      );
    },
  });
}

/** Forget one decision. That sender returns to Unsorted. */
export function useDeleteSenderRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) =>
      apiFetch(`/mailbox/sender-rules/${ruleId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.mailbox.all });
    },
  });
}

/** Download a file off a message that was never stored.
 *
 *  Addressed by Gmail's message id and the MIME part id rather than by a row
 *  id, because there is no row — same reason as `downloadMailAttachment`, it
 *  goes through fetch so the Authorization header is sent. */
export async function downloadInboxAttachment(
  messageId: string,
  partId: string,
  filename: string,
) {
  const file = await apiFetch<Blob>(
    `/mailbox/inbox/messages/${messageId}/attachments/${partId}/download`,
    { blob: true },
  );
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/* --- Samples (FR-SAMP) --------------------------------------------------- */

/**
 * The chase list. Ordered overdue-first by the server, so the component does
 * not re-sort and disagree with the count on the board above it.
 */
export function useSamples(params: SampleListParams) {
  return useQuery({
    queryKey: keys.samples.list(params),
    queryFn: () =>
      apiFetch<Page<SampleRequestListItem>>(`/samples${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}

export function useSample(id: number | null) {
  return useQuery({
    queryKey: keys.samples.detail(id ?? 0),
    queryFn: () => apiFetch<SampleRequestDetail>(`/samples/${id}`),
    enabled: id !== null,
  });
}

export function useSamplePipeline() {
  return useQuery({
    queryKey: keys.samples.pipeline,
    queryFn: () => apiFetch<SamplePipeline>("/samples/pipeline"),
  });
}

export function useCreateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SampleCreateInput) =>
      apiFetch<SampleRequestDetail>("/samples", { method: "POST", json: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.samples.all });
    },
  });
}

export function useUpdateSample(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SampleUpdateInput) =>
      apiFetch<SampleRequestDetail>(`/samples/${id}`, {
        method: "PATCH",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.samples.all });
    },
  });
}

/**
 * Move a sample along, carrying whatever moved it.
 *
 * One mutation rather than a status call plus an edit: a sample marked Shipped
 * with no courier and no tracking number says less than the email it came
 * from, and a second form is where that detail goes to be forgotten.
 */
export function useChangeSampleStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SampleStatusChangeInput) =>
      apiFetch<SampleRequestDetail>(`/samples/${id}/status`, {
        method: "POST",
        json: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.samples.all });
    },
    onError: (error) => {
      // The server owns the state machine and refuses an illegal move with a
      // sentence naming what *is* legal. Worth showing verbatim.
      toast.error(
        error instanceof ApiError ? error.message : "Could not move that sample.",
      );
    },
  });
}

export function useDeleteSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ detail: string }>(`/samples/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.samples.all });
    },
  });
}
