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

export type ProductListItem = {
  id: number;
  name_en: string;
  name_cn: string | null;
  variant: string | null;
  cas_number: string | null;
  cas_is_verified: boolean;
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
export type ProductUpdateInput = Partial<ProductCreateInput>;

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
  country_id: number | null;
  status: TenderStatus;
  closing_date: string | null;
  notes: string | null;
  item_count: number;
  /** Distinct products; lower than item_count when one product is
   *  shortlisted from several suppliers. */
  product_count: number;
  created_at: string;
  updated_at: string;
};

export type TenderDetail = TenderListItem & {
  items: TenderItem[];
};

export type TenderListParams = ListParams & {
  status?: TenderStatus;
};

export type TenderCreateInput = {
  name: string;
  reference_no?: string | null;
  buyer_name?: string | null;
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
