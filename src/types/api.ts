/**
 * Response shapes from the FastAPI backend, mirrored from its OpenAPI document
 * (`/api/v1/openapi.json`). Enums live in `domain.ts`; this file holds the
 * request/response envelopes the query hooks consume.
 *
 * Kept by hand for now. When the generated Zod schemas land (05-architecture
 * §A3) these become derived rather than authored.
 */

import type {
  ApplicationType,
  CommercialStatus,
  CompanyStatus,
  CompanyType,
  MarketSegment,
  MaterialType,
  PackagingType,
  SterilizationMethod,
  UserRole,
} from "./domain";

export type { UserRole };

/** Every list endpoint returns this envelope. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
};

export type CountryRef = {
  id: number;
  iso2: string;
  name: string;
};

export type CompanyListItem = {
  id: number;
  name_en: string;
  name_cn: string | null;
  short_name: string | null;
  company_type: CompanyType;
  status: CompanyStatus;
  city: string | null;
  website: string | null;
  is_watchlisted: boolean;
  country: CountryRef | null;
};

/** A contact as embedded on the company detail page, channels included. */
export type CompanyContact = {
  id: number;
  name_en: string;
  name_cn: string | null;
  designation: string | null;
  department: string | null;
  is_primary: boolean;
  channels: SearchChannel[];
};

/** GET /companies/{id} — the detail-page shape. */
export type CompanyDetail = CompanyListItem & {
  address: string | null;
  lead_source: string | null;
  notes: string | null;
  contacts: CompanyContact[];
};

export type ContactListItem = {
  id: number;
  name_en: string;
  name_cn: string | null;
  designation: string | null;
  department: string | null;
  is_primary: boolean;
  company: { id: number; name_en: string } | null;
  channels: SearchChannel[];
};

/**
 * What a product *is*, rolled up across every live offer for it. Category,
 * pharmacopoeia and origin are properties of the offer, not the product (D14) —
 * the same substance is an API to one supplier and an excipient to another — so
 * the list shows the distinct set across suppliers, most-offered first.
 *
 * Always present on a list row, empty rather than absent for a product no
 * supplier has been attached to yet.
 */
export type ProductFacets = {
  material_types: MaterialType[];
  /** Compendium codes — USP, BP, EP, JP… */
  compendia: string[];
  countries: CountryRef[];
  applications: ApplicationType[];
  supplier_count: number;
};

export type ProductListItem = {
  id: number;
  name_en: string;
  name_cn: string | null;
  variant: string | null;
  cas_number: string | null;
  cas_is_verified: boolean;
  indication_text: string | null;
  therapeutic_classes: string[];
  is_packaging: boolean;
  created_at: string | null;
  facets: ProductFacets;
};

/** GET /products/{id} — mirrors backend ProductOut. Everything the list row
 *  leaves out, which is what the details dialog exists to show. */
export type ProductDetail = ProductListItem & {
  molecular_formula: string | null;
  cas_raw: string | null;
  parent_product_id: number | null;
  relation_to_parent: string | null;
  notes: string | null;
  synonyms: { id: number; synonym: string; synonym_type: string }[];
  packaging_spec: PackagingSpec | null;
  /** Same axis as `therapeutic_classes`, with ids — the strings read well, the
   *  refs are what an edit form binds a selection to. */
  categories: TherapeuticCategoryRef[];
  updated_at: string;
};

/** The therapeutic axis (FR-PROD-08). User-managed, so it is a lookup rather
 *  than an enum the client can hard-code. */
export type TherapeuticCategoryRef = {
  id: number;
  name: string;
  name_cn: string | null;
};

/** GET /products/{id}/suppliers — who sells this product and how to reach
 *  them. Deliberately the same `SearchSupplier` shape the search results
 *  carry: the answer to "who makes this" should not differ by how the user
 *  got here. */
export type ProductSuppliers = {
  items: SearchSupplier[];
  /** All of them, which may exceed items.length when the cap bites. */
  total: number;
};

/** One tile on the products header strip. */
export type ProductStatBucket = {
  key: "total" | "api" | "excipient" | "packaging_material" | "other";
  label: string;
  count: number;
  /** Percent growth over the trailing window; null when there is no baseline to
   *  compare against, which the UI renders as no trend line rather than 0%. */
  change_pct: number | null;
};

/** GET /products/stats. Category buckets partition the catalogue, so the four
 *  of them sum to `total`. */
export type ProductStats = {
  buckets: ProductStatBucket[];
  window_days: number;
};

export type OfferListItem = {
  id: number;
  company: { id: number; name_en: string } | null;
  product: {
    id: number;
    name_en: string;
    cas_number: string | null;
    indication_text: string | null;
    /** Independent of material type (FR-PROD-08); a product may have several. */
    therapeutic_classes: string[];
  } | null;
  material_type: MaterialType | null;
  market_segment: string | null;
  commercial_status: string | null;
  is_sterile: boolean;
  is_watchlisted: boolean;
  /** This supplier's own spec — can differ between suppliers of the same product. */
  spec_text: string | null;
  qualification_text: string | null;
  packing_text: string | null;
  /** Current price, not a dated quote. `price_max` null means a fixed price;
   *  otherwise this is a band. NEVER render the amount without `price_unit` —
   *  per-piece and per-kg differ by orders of magnitude on the same item. Show
   *  `price_asof` too, so a stale marketplace figure reads as stale. */
  price_min: string | null;
  price_max: string | null;
  currency: string | null;
  price_unit: string | null;
  moq: string | null;
  moq_unit: string | null;
  price_asof: string | null;
};

/** GET /offers/{id} — everything the offer carries, including the fields the
 *  list view leaves out (compendia, polymorph, remarks, incoterm). */
export type OfferDetail = OfferListItem & {
  application: string | null;
  polymorph: string | null;
  cn_status_grade: string | null;
  remarks: string | null;
  interest_note: string | null;
  leaflet_ref: string | null;
  incoterm: string | null;
  price_source: string | null;
  manufacturer: { id: number; name_en: string } | null;
  compendia: {
    edition: string | null;
    compendium: { id: number; code: string; name: string };
  }[];
  created_at: string;
  updated_at: string;
};

/** Dimensional identity of a packaging product. Scalars only — a supplier
 *  advertising "13/20/28/32mm" is four products, not one. */
export type PackagingSpec = {
  product_id: number;
  pkg_type: PackagingType;
  subtype: string | null;
  material_code: string | null;
  size_mm: string | null;
  thickness_mm: string | null;
  width_mm: string | null;
  volume_ml: string | null;
  unit_weight_g: string | null;
  coating: string | null;
  sterilization: SterilizationMethod | null;
  colour: string | null;
  standard_ref: string | null;
  extra: Record<string, unknown> | null;
};

export type PackagingSpecInput = Omit<PackagingSpec, "product_id">;

export type LabelledCount = {
  label: string;
  count: number;
};

export type DashboardStats = {
  counts: {
    companies: number;
    contacts: number;
    products: number;
    offers: number;
    documents: number;
    open_samples: number;
  };
  offers_by_material_type: LabelledCount[];
  companies_by_country: LabelledCount[];
};

/** How the backend interpreted the query (services/search.py ladder). */
export type SearchStrategy =
  | "empty"
  | "cas_exact"
  | "exact_name"
  | "partial"
  | "fuzzy";

/** backend/app/models/enums.py ChannelType. */
export type ChannelType =
  | "mobile"
  | "phone"
  | "fax"
  | "email"
  | "wechat"
  | "whatsapp"
  | "skype"
  | "linkedin"
  | "qr_image";

export type SearchChannel = {
  channel: ChannelType;
  value: string;
  is_primary: boolean;
};

/** POST/PATCH /contacts channel entry — mirrors backend ChannelIn. */
export type ChannelInput = {
  channel: ChannelType;
  value: string;
  is_primary?: boolean;
};

export type ContactCreateInput = {
  company_id: number;
  name_en: string;
  name_cn?: string | null;
  designation?: string | null;
  department?: string | null;
  is_primary?: boolean;
  notes?: string | null;
  channels: ChannelInput[];
};

/** Omitting `channels` leaves them untouched; `channels: []` clears them —
 *  the edit form always submits the full set it displayed. */
export type ContactUpdateInput = {
  name_en?: string;
  name_cn?: string | null;
  designation?: string | null;
  department?: string | null;
  is_primary?: boolean;
  notes?: string | null;
  channels?: ChannelInput[];
};

export type SearchContact = {
  id: number;
  name_en: string;
  name_cn: string | null;
  designation: string | null;
  channels: SearchChannel[];
};

export type SearchSupplier = {
  /** The supplier_product row behind this card — carried into a tender
   *  shortlist so the line keeps the spec the buyer was looking at. */
  offer_id: number | null;
  company_id: number;
  company_name: string;
  company_name_cn: string | null;
  country: string | null;
  /** ISO 3166-1 alpha-2 — used to render the flag beside the country name. */
  country_code: string | null;
  city: string | null;
  contact: SearchContact | null;
  /** Set only when the company has no named contact person. */
  fallback_email: string | null;
  /** This supplier's own spec — can differ between suppliers of the same product. */
  specification: string | null;
  qualification: string | null;
  packing: string | null;
  /** What this supplier offers the product *as*. Lives on the offer, not the
   *  product — the same substance is an API to one supplier, an excipient to
   *  another — which is why the category facet is per result row, not per
   *  product. */
  material_type: MaterialType | null;
};

/** Search returns products only — companies and contacts have their own
 *  screens — but each product carries its top suppliers + contacts inline. */
export type SearchResults = {
  query: string;
  strategy: SearchStrategy;
  total: number;
  products: {
    id: number;
    name_en: string;
    name_cn: string | null;
    variant: string | null;
    cas_number: string | null;
    cas_is_verified: boolean;
    indication_text: string | null;
    /** Independent of material type (FR-PROD-08); a product may have several. */
    therapeutic_classes: string[];
    suppliers: SearchSupplier[];
    /** May exceed suppliers.length — the API caps how many come back inline. */
    supplier_count: number;
  }[];
};

/** Query parameters shared by every paginated list endpoint. */
export type ListParams = {
  q?: string;
  page?: number;
  size?: number;
  sort?: string;
  order?: "asc" | "desc";
};

export type ProductListParams = ListParams & {
  has_cas?: boolean;
  parent_product_id?: number;
  /** Filter to one packaging family. */
  pkg_type?: PackagingType;
  /** true = packaging materials only, false = chemicals only. A product counts
   *  as packaging when it has a packaging_spec row — there is no material_type
   *  on the product itself, that lives on the offer. */
  is_packaging?: boolean;
  /** Products any supplier offers as this material type. Asks "is this sold as
   *  an X", not "is this an X" — the same question the Category column answers. */
  material_type?: MaterialType;
};

export type CompanyListParams = ListParams & {
  country_id?: number;
  company_type?: CompanyType;
  status?: CompanyStatus;
  material_type?: MaterialType;
  is_watchlisted?: boolean;
};

/** PATCH /companies/{id} — every field optional, only what's sent changes. */
export type CompanyUpdateInput = {
  name_en?: string;
  name_cn?: string | null;
  short_name?: string | null;
  company_type?: CompanyType;
  status?: CompanyStatus;
  country_id?: number | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  is_watchlisted?: boolean;
  notes?: string | null;
};

/** POST /products body — mirrors backend ProductCreate. */
export type ProductCreateInput = {
  name_en: string;
  name_cn?: string | null;
  variant?: string | null;
  molecular_formula?: string | null;
  indication_text?: string | null;
  notes?: string | null;
  cas?: string | null;
  /** Set only for packaging materials. Its presence is what subjects the
   *  product to spec-based duplicate detection instead of name-based. */
  packaging_spec?: PackagingSpecInput | null;
};

/** PATCH /products/{id} — every field optional. */
export type ProductUpdateInput = Partial<ProductCreateInput> & {
  /** Replaces the therapeutic axis wholesale. Omit to leave it untouched;
   *  `[]` clears it. */
  category_ids?: number[];
};

/** POST /offers body — mirrors backend OfferCreate (a company↔product link
 *  with this supplier's own spec, material type, etc). */
export type OfferCreateInput = {
  company_id: number;
  product_id: number;
  material_type?: MaterialType | null;
  market_segment?: MarketSegment | null;
  application?: ApplicationType | null;
  commercial_status?: CommercialStatus | null;
  is_sterile?: boolean;
  spec_text?: string | null;
  qualification_text?: string | null;
  packing_text?: string | null;
  remarks?: string | null;
  /** Price, not quotation. The backend rejects an amount without `currency`
   *  and `price_unit`, and rejects an inverted band — send all three. */
  price_min?: string | number | null;
  price_max?: string | number | null;
  currency?: string | null;
  price_unit?: string | null;
  moq?: string | number | null;
  moq_unit?: string | null;
  incoterm?: string | null;
  price_source?: string | null;
  price_asof?: string | null;
};

/** PATCH /offers/{id} — every field optional. */
export type OfferUpdateInput = Partial<
  Omit<OfferCreateInput, "company_id" | "product_id">
>;

export type OfferListParams = ListParams & {
  company_id?: number;
  product_id?: number;
  /** "packaging_material" turns the offers screen into the packaging list. */
  material_type?: MaterialType;
};

/* -------------------------------------------------------------------------
 * Tenders (FR-TENDER)
 *
 * A tender is one government bid. Its shortlist is built from search: each
 * entry is a (product, supplier) pair, and the same pair can sit on several
 * tenders at once — two open bids that both need the same molecule are the
 * normal case, not a duplicate.
 * ---------------------------------------------------------------------- */

export type TenderStatus = "draft" | "submitted" | "won" | "lost" | "cancelled";

/** How a live tender reads on the board — derived from status + closing_date,
 *  not a stored value. See `display_status_expr` on the backend. */
export type TenderDisplayStatus =
  | "open"
  | "closing_soon"
  | "awarded"
  | "cancelled"
  | "lost";

export type TenderAuthorityType = "government" | "private";

export type TenderItem = {
  id: number;
  tender_id: number;
  product_id: number;
  product_name: string;
  product_name_cn: string | null;
  cas_number: string | null;
  company_id: number | null;
  company_name: string | null;
  country: string | null;
  country_code: string | null;
  supplier_product_id: number | null;
  specification: string | null;
  packing: string | null;
  material_type: MaterialType | null;
  quantity: string | null;
  quantity_unit: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TenderListItem = {
  id: number;
  name: string;
  reference_no: string | null;
  buyer_name: string | null;
  authority_type: TenderAuthorityType | null;
  country_id: number | null;
  status: TenderStatus;
  display_status: TenderDisplayStatus;
  closing_date: string | null;
  notes: string | null;
  item_count: number;
  /** Distinct products; lower than item_count when one product is
   *  shortlisted from several suppliers. */
  product_count: number;
  /** Distinct products with a quotation in hand — the progress bar's
   *  numerator. See `sourced_counts_for` on the backend. */
  sourced_count: number;
  created_at: string;
  updated_at: string;
};

export type TenderDetail = TenderListItem & {
  items: TenderItem[];
};

export type TenderListParams = ListParams & {
  status?: TenderStatus;
  display_status?: TenderDisplayStatus;
  authority_type?: TenderAuthorityType;
  closing_from?: string;
  closing_to?: string;
  scope?: "mine" | "participated";
};

export type TenderStatBucket = {
  count: number;
  /** null when the prior 30-day window had zero tenders in this bucket. */
  delta_pct: number | null;
};

export type TenderStats = {
  total: TenderStatBucket;
  open: TenderStatBucket;
  closing_soon: TenderStatBucket;
  awarded: TenderStatBucket;
  cancelled: TenderStatBucket;
};

export type TenderCreateInput = {
  name: string;
  reference_no?: string | null;
  buyer_name?: string | null;
  authority_type?: TenderAuthorityType | null;
  country_id?: number | null;
  closing_date?: string | null;
  notes?: string | null;
  status?: TenderStatus;
};

export type TenderUpdateInput = Partial<TenderCreateInput>;

export type TenderItemInput = {
  product_id: number;
  company_id?: number | null;
  supplier_product_id?: number | null;
  quantity?: string | number | null;
  quantity_unit?: string | null;
  note?: string | null;
};

/** Which tenders a given search row already sits on. Fetched once per result
 *  page rather than per card. */
export type ShortlistMembership = {
  tender_id: number;
  tender_name: string;
  item_id: number;
  product_id: number;
  company_id: number | null;
};

/* -- Import (SRS FR-IMP, 05-architecture Part C) -------------------------- */

export type ImportSource = "csv" | "excel" | "leaflet_ocr";

export type ImportStatus =
  | "uploaded"
  | "parsed"
  | "previewed"
  /** Prepared and handed to an owner for sign-off; still writes nothing. */
  | "pending_approval"
  | "committed"
  | "failed"
  | "rolled_back";

/** A system field an uploaded column can be mapped onto. Served by the API so
 *  the mapping UI and the parser can never disagree about the vocabulary. */
export type ImportField = {
  key: string;
  label: string;
  group: "company" | "contact" | "product" | "offer";
  required: boolean;
  help: string;
};

export type SheetColumn = {
  index: number;
  header: string;
  samples: string[];
  suggested_field: string | null;
  /** No header and no values anywhere — the consolidated sheet's spacers. */
  is_empty: boolean;
};

export type SheetPreview = {
  upload_token: string;
  filename: string;
  source: ImportSource;
  file_sha256: string;
  sheet_names: string[];
  sheet_name: string | null;
  header_row: number;
  total_rows: number;
  columns: SheetColumn[];
  suggested_map: Record<string, number>;
  /** An earlier batch with byte-identical contents, if any. */
  duplicate_of: number | null;
};

export type StageInput = {
  upload_token: string;
  filename: string;
  column_map: Record<string, number>;
  header_row?: number | null;
  sheet_name?: string | null;
};

export type ImportBatch = {
  id: number;
  filename: string;
  source: ImportSource;
  status: ImportStatus;
  total_rows: number | null;
  valid_rows: number | null;
  error_rows: number | null;
  companies_created: number | null;
  products_created: number | null;
  offers_created: number | null;
  started_at: string | null;
  finished_at: string | null;
  submitted_by: number | null;
  submitted_at: string | null;
  notes: string | null;
  column_map: Record<string, number> | null;
  source_document_id: number | null;
  created_at: string;
  created_by: number | null;
};

export type ImportPreviewSummary = {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
  to_create: number;
  to_update: number;
  to_skip: number;
};

export type ImportRowError = {
  column_name: string | null;
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type ImportRowAction = "create" | "update" | "skip_duplicate";

export type ImportRow = {
  id: number;
  row_no: number;
  raw: Record<string, string>;
  normalised: Record<string, unknown> | null;
  is_valid: boolean | null;
  action: ImportRowAction | null;
  resolved_company_id: number | null;
  resolved_product_id: number | null;
  errors: ImportRowError[];
};

export type ImportRowFilter =
  | "errors"
  | "warnings"
  | "create"
  | "update"
  | "skip_duplicate";

export type OcrStatus = {
  available: boolean;
  tesseract_path: string | null;
  languages: string[];
  chinese_available: boolean;
  detail: string | null;
};

export type OcrBatchResult = {
  batch: ImportBatch;
  summary: ImportPreviewSummary;
  mean_confidence: number;
  header_found: boolean;
  column_count: number;
  document_id: number | null;
  warnings: string[];
  text: string;
};

/** A company the API thinks resembles one being created. A warning, never a
 *  block (FR-CO-05) — two real suppliers can share a name stem. */
export type SimilarCompany = {
  id: number;
  name_en: string;
  reason: "similar_name" | "same_domain";
};

export type CompanyCreateInput = {
  name_en: string;
  name_cn?: string | null;
  short_name?: string | null;
  company_type?: CompanyListItem["company_type"];
  status?: CompanyListItem["status"];
  country_id?: number | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  lead_source?:
    | "trade_fair"
    | "referral"
    | "email"
    | "web"
    | "existing_relationship"
    | "other";
  is_watchlisted?: boolean;
  notes?: string | null;
};

export type CompanyCreateResult = {
  company: CompanyDetail;
  warnings: SimilarCompany[];
};

/* -------------------------------------------------------------------------
 * Sourcing (FR-SRC)
 *
 * One supplier inquiry, the conversations it produces, and the quotations that
 * come back. A request does not need a tender behind it — speculative sourcing
 * is a real workflow (decision 2026-08-21).
 * ---------------------------------------------------------------------- */

export type SourcingStatus =
  | "draft"
  | "sent"
  | "replied"
  | "quotation_received"
  | "negotiating"
  | "selected"
  | "rejected"
  | "no_response"
  | "cancelled";

export type CommunicationChannel =
  | "email"
  | "phone"
  | "whatsapp"
  | "wechat"
  | "meeting"
  | "other";

export type CommunicationDirection = "outbound" | "inbound";

export type SourcingProductRef = {
  id: number;
  name_en: string;
  cas_number: string | null;
};

export type SourcingCompanyRef = {
  id: number;
  name_en: string;
  name_cn: string | null;
};

export type SourcingContactRef = {
  id: number;
  name_en: string;
  designation: string | null;
};

export type SourcingTenderRef = {
  id: number;
  name: string;
  reference_no: string | null;
  closing_date: string | null;
};

export type Quotation = {
  id: number;
  sourcing_request_id: number;
  source_communication_id: number | null;
  quoted_on: string;
  /** A band; `price_max` null means a fixed price. NEVER render an amount
   *  without `price_unit` — per-kg and per-piece differ by orders of magnitude. */
  price_min: string | null;
  price_max: string | null;
  currency: string | null;
  price_unit: string | null;
  moq: string | null;
  moq_unit: string | null;
  packing: string | null;
  lead_time_days: number | null;
  incoterm: string | null;
  valid_until: string | null;
  specification: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Communication = {
  id: number;
  company_id: number;
  contact_person_id: number | null;
  sourcing_request_id: number | null;
  tender_id: number | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  occurred_at: string;
  subject: string | null;
  body: string | null;
  counterparty: string | null;
  external_id: string | null;
  external_thread_id: string | null;
  has_attachments: boolean;
};

export type StatusHistoryEntry = {
  id: number;
  from_status: SourcingStatus | null;
  to_status: SourcingStatus;
  changed_at: string;
  changed_by: number | null;
  note: string | null;
};

export type SourcingRequestListItem = {
  id: number;
  status: SourcingStatus;
  product: SourcingProductRef;
  company: SourcingCompanyRef;
  contact_person: SourcingContactRef | null;
  /** Null for a speculative inquiry with no bid behind it. */
  tender: SourcingTenderRef | null;
  required_quantity: string | null;
  quantity_unit: string | null;
  sent_at: string | null;
  first_replied_at: string | null;
  follow_up_on: string | null;
  target_price_min: string | null;
  target_price_max: string | null;
  target_currency: string | null;
  target_price_unit: string | null;
  created_at: string;
  quotation_count: number;
  communication_count: number;
};

export type SourcingRequestDetail = SourcingRequestListItem & {
  required_specification: string | null;
  required_packing: string | null;
  required_documents: string[] | null;
  supplier_product_id: number | null;
  notes: string | null;
  updated_at: string;
  history: StatusHistoryEntry[];
  communications: Communication[];
  quotations: Quotation[];
};

export type SourcingRequestParams = ListParams & {
  status?: SourcingStatus;
  tender_id?: number;
  product_id?: number;
  company_id?: number;
  follow_up_before?: string;
  /** true = speculative inquiries only, false = tender-backed only. */
  untendered?: boolean;
};

export type SourcingPipelineColumn = {
  status: SourcingStatus;
  label: string;
  count: number;
};

export type SourcingPipeline = {
  columns: SourcingPipelineColumn[];
  total: number;
};

export type SourcingRequestCreateInput = {
  product_id: number;
  company_id: number;
  contact_person_id?: number | null;
  supplier_product_id?: number | null;
  tender_id?: number | null;
  required_quantity?: string | null;
  quantity_unit?: string | null;
  required_specification?: string | null;
  required_packing?: string | null;
  required_documents?: string[] | null;
  target_price_min?: string | null;
  target_price_max?: string | null;
  target_currency?: string | null;
  target_price_unit?: string | null;
  follow_up_on?: string | null;
  notes?: string | null;
};

export type SourcingRequestUpdateInput = Partial<
  Omit<SourcingRequestCreateInput, "product_id" | "company_id">
>;

export type CommunicationCreateInput = {
  company_id: number;
  contact_person_id?: number | null;
  sourcing_request_id?: number | null;
  tender_id?: number | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  occurred_at?: string | null;
  subject?: string | null;
  body?: string | null;
  counterparty?: string | null;
  has_attachments?: boolean;
};

/* -------------------------------------------------------------------------
 * Activity feed (SRS FR-ADM-02)
 * ---------------------------------------------------------------------- */

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "upload"
  | "download"
  | "export"
  | "import";

export type ActivityEntry = {
  id: number;
  occurred_at: string;
  description: string;
  entity_type: string;
  entity_id: number | null;
  href: string | null;
  action: ActivityAction;
  user_id: number | null;
  user_name: string | null;
};
