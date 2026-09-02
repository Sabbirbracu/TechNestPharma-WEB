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
  SampleStatus,
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
  /** A departmental email and a contact's phone/mobile — batch-looked-up
   *  alongside the row, not columns on the company itself. Either can be
   *  null when nothing is on file yet. */
  email: string | null;
  phone: string | null;
};

export type CompanyStats = {
  total: number;
  active: number;
  /** `manufacturer` + `manufacturer_trader` vs `trader` + `agent`. */
  manufacturers: number;
  traders_agents: number;
  country_count: number;
};

/** A contact as embedded on the company detail page, channels included. */
export type CompanyContact = {
  id: number;
  name_en: string;
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

export type ContactCompanyRef = {
  id: number;
  name_en: string;
  /** Not a field on the contact itself — read off the company relationship. */
  country: CountryRef | null;
};

export type ContactListItem = {
  id: number;
  name_en: string;
  designation: string | null;
  department: string | null;
  is_primary: boolean;
  company: ContactCompanyRef;
  channels: SearchChannel[];
};

/** GET /contacts/{id} — adds what the list doesn't carry. */
export type ContactDetail = ContactListItem & {
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactStatBucket = {
  count: number;
  /** null when the prior 30-day window had zero contacts/emails in this bucket. */
  delta_pct: number | null;
};

export type ContactStats = {
  total: ContactStatBucket;
  primary: ContactStatBucket;
  companies: ContactStatBucket;
  emails_sent: ContactStatBucket;
  replies_received: ContactStatBucket;
};

/** GET /contacts/{id}/activity — real Communication rows tied to this
 *  person, not a generic feed. No "document shared" entries exist anywhere
 *  in the system yet. */
export type ContactActivityEntry = {
  id: number;
  occurred_at: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string | null;
};

export type ContactListParams = ListParams & {
  company_id?: number;
  department?: string;
  country_id?: number;
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
  /** Every supplier's name, most-offered first — shown in place of
   *  CAS/Applications when the catalogue is filtered to packaging materials
   *  (first name visible, the rest behind a "show more" toggle). */
  suppliers: string[];
  /** The cheapest priced offer, from whichever (currency, price_unit) group
   *  has the most offers backing it. All null when no supplier has priced
   *  this product — still most of the catalogue today. */
  price_min: string | null;
  price_max: string | null;
  price_currency: string | null;
  price_unit: string | null;
  price_moq: string | null;
  price_moq_unit: string | null;
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
  /** The catalogue's own classification — the one badge a list/search row
   *  leads with. `facets.material_types` is the separate "offered as" axis
   *  (what suppliers call it), shown only in the details view. Null reads as
   *  "Uncategorised". */
  material_type: MaterialType | null;
  created_at: string | null;
  parent_product_id: number | null;
  /** Live children hanging off this row — different sizes/colours of the same
   *  packaging item, salts of the same API, etc. 0 means this row is either a
   *  leaf product or a variant itself; a row with children is a family
   *  heading, fetched via `?parent_product_id=<id>` to see them. */
  variant_count: number;
  /** Already eager-loaded for every row, packaging or not — costs nothing
   *  extra, and the variant breakdown wants size/colour without a second
   *  fetch. Null for anything that isn't a packaging item. */
  packaging_spec: PackagingSpec | null;
  facets: ProductFacets;
};

/** GET /products/{id} — mirrors backend ProductOut. Everything the list row
 *  leaves out, which is what the details dialog exists to show. */
export type ProductDetail = ProductListItem & {
  molecular_formula: string | null;
  cas_raw: string | null;
  relation_to_parent: string | null;
  notes: string | null;
  synonyms: { id: number; synonym: string; synonym_type: string }[];
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
  /** Raw per-`doc_type` counts, not pre-grouped — the dashboard's Documents
   *  card buckets them into its five tiles, the documents page can group its
   *  own way. Types with no documents are absent rather than zero. */
  documents_by_type: LabelledCount[];
  recent_samples: RecentSample[];
};

/** A row of the dashboard's sample feed. Product and supplier are resolved
 *  through `supplier_product` server-side — a sample points at an offer, not
 *  at a product. */
export type RecentSample = {
  id: number;
  product_name: string;
  company_name: string;
  status: SampleStatus;
  /** ISO date. */
  requested_on: string;
};

/** The six lines the dashboard can draw. The last three are the `ProductStats`
 *  bucket keys — a tile's count comes from /products/stats and its sparkline
 *  from /dashboard/timeseries, so they name the same partition. */
export type DashboardSeriesKey =
  | "manufacturers"
  | "products"
  | "contacts"
  | "api"
  | "excipient"
  | "packaging_material";

export type SeriesPoint = {
  /** ISO date, one per day of the window with gaps filled in. */
  date: string;
  /** Running total at the end of that day, not the number added on it. */
  value: number;
};

export type DashboardSeries = {
  key: DashboardSeriesKey;
  label: string;
  points: SeriesPoint[];
  /** Running total the day before the window opened — what `change_pct`
   *  measures against. */
  start_value: number;
  end_value: number;
  /** null when the series was empty before the window, which the UI renders as
   *  "new" rather than an invented percentage. */
  change_pct: number | null;
};

/** GET /dashboard/timeseries. Separate from /dashboard because it is the only
 *  part that moves with the chart's range selector. */
export type DashboardTimeseries = {
  from_date: string;
  to_date: string;
  window_days: number;
  series: DashboardSeries[];
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
  designation?: string | null;
  department?: string | null;
  is_primary?: boolean;
  notes?: string | null;
  channels?: ChannelInput[];
};

export type SearchContact = {
  id: number;
  name_en: string;
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
  /** What this supplier offers the product *as* — can differ from the
   *  product's own `material_type` below. Per-supplier detail only; not the
   *  badge a result card leads with any more. */
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
    /** The catalogue's own classification — the badge a result card leads
     *  with. Null reads as "Uncategorised". */
    material_type: MaterialType | null;
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
  /** The catalogue's own classification — independent of any one supplier's
   *  claim (that lives on the offer, D14). */
  material_type?: MaterialType | null;
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
  | "closed"
  | "awarded"
  | "cancelled"
  | "lost";

export type TenderAuthorityType = "government" | "private";

export type TenderShortlist = {
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
  shortlists: TenderShortlist[];
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

export type TenderShortlistInput = {
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
  updated_at: string;
  quotation_count: number;
  communication_count: number;
  /** Newest message in each direction, derived per page from `communication`.
   *  Both null on a request nobody has written on yet. */
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  /** max(updated_at, newest message) — what the Last Activity column reads.
   *  Never null in practice; the request was at least created. */
  last_activity_at: string | null;
  /** The supplier had the last word, so we owe them an answer. Drives the
   *  row's "New reply" marker and the Needs Attention counts. */
  awaiting_us: boolean;
};

export type SourcingRequestDetail = SourcingRequestListItem & {
  required_specification: string | null;
  required_packing: string | null;
  required_documents: string[] | null;
  supplier_product_id: number | null;
  notes: string | null;
  history: StatusHistoryEntry[];
  communications: Communication[];
  quotations: Quotation[];
};

// --- Tender notices (notice pipeline) ---------------------------------------
//
// The hierarchy, and the reason `TenderItem` means what it means:
//
//   TenderNotice        one published document ("EDCL Tender Notice, 15 Aug")
//     └── Tender        one bid within it, identified by its reference number
//           └── TenderItem      what the notice ASKS FOR, as it worded it
//                 └── matched Product   nullable — the notice can name
//                                       something the catalogue has never held
//
// A tender item is never a product. `raw_name` is the notice's own wording and
// is never rewritten; the link to the catalogue is a separate, nullable,
// human-confirmed decision.

export type NoticeStatus =
  | "captured"
  | "extracting"
  | "extracted"
  | "needs_review"
  | "confirmed"
  | "failed";

/** `confirmed` is only ever set by a person — the matcher's ceiling is
 *  `suggested`, however certain it is. */
export type MappingStatus = "unmapped" | "suggested" | "confirmed" | "skipped";

/** Which tier produced a suggestion. Always shown beside the score: "84%" on
 *  its own is a number nobody can argue with. */
export type MatchMethod = "exact" | "normalized" | "alias" | "fuzzy" | "manual";

export type TenderType = "international" | "local";

export type NoticeSource = {
  id: number;
  name: string;
  full_name: string | null;
  base_url: string | null;
  /** "manual" means upload-only — no fetcher exists for it yet. */
  adapter: string;
  is_enabled: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
};

export type MatchCandidate = {
  product_id: number;
  name: string;
  cas_number: string | null;
  confidence: string;
  method: MatchMethod;
};

export type TenderItemProductRef = {
  id: number;
  name_en: string;
  cas_number: string | null;
};

/** One company that can supply a line's matched product.
 *
 *  Keyed on the OFFER, not the company: a company can hold several offers for
 *  one product (different grades or plants) and the buyer may want one and not
 *  the other. Several offers from the same company collapse to a single
 *  shortlist row on confirmation, because a bid is against a company. */
export type ItemSupplier = {
  id: number;
  company_id: number;
  company_name: string;
  supplier_product_id: number;
  is_selected: boolean;
  country: string | null;
  price_min: string | null;
  price_max: string | null;
  currency: string | null;
  price_unit: string | null;
};

export type NoticeTenderItem = {
  id: number;
  line_no: number;
  /** Verbatim from the notice. Never rewritten by the matcher. */
  raw_name: string;
  /** The pharmacopoeia read off the end — "BP", "USP", "Ph. Gr." */
  specification: string | null;
  matched_product_id: number | null;
  matched_product: TenderItemProductRef | null;
  mapping_status: MappingStatus;
  match_confidence: string | null;
  match_method: MatchMethod | null;
  mapped_at: string | null;
  quantity: string | null;
  quantity_unit: string | null;
  remarks: string | null;
  /** Every company offering the matched product, ticked by default. */
  suppliers: ItemSupplier[];
};

export type NoticeTender = {
  id: number;
  name: string;
  reference_no: string | null;
  notice_date: string | null;
  tender_type: TenderType | null;
  closing_date: string | null;
  closing_time: string | null;
  opening_date: string | null;
  opening_time: string | null;
  schedule_cost: string | null;
  schedule_currency: string | null;
  schedule_cost_usd: string | null;
  procurement_basis: string | null;
  /** The procuring authority. Usually the same across every tender in a
   *  notice, but it prefixes each reference in the UI — six references that
   *  differ only in a serial number are otherwise hard to tell apart. */
  buyer_name: string | null;
  items: NoticeTenderItem[];
  item_count: number;
  /** confirmed + skipped — every line a human has finished with. */
  mapped_count: number;
  /** How many shortlist rows a confirm would create right now, deduped the
   *  way the database will dedupe them. */
  selected_supplier_count: number;
  /** NULL while this tender is still a machine's reading of the notice. */
  notice_confirmed_at: string | null;
};

export type TenderConfirmResult = {
  tender_id: number;
  reference_no: string | null;
  shortlisted: number;
  items_mapped: number;
  items_total: number;
  detail: string;
};

export type TenderNoticeListItem = {
  id: number;
  title: string;
  source_name: string | null;
  source_url: string | null;
  notice_date: string | null;
  detected_at: string | null;
  status: NoticeStatus;
  /** "pdf_table" (exact) | "pdf_text" | "ocr_layout" | "ocr" */
  extraction_method: string | null;
  extraction_confidence: string | null;
  original_filename: string | null;
  file_size_bytes: number | null;
  page_count: number | null;
  created_at: string;
  tender_count: number;
  item_count: number;
  mapped_count: number;
};

export type TenderNoticeDetail = TenderNoticeListItem & {
  extraction_error: string | null;
  extracted_at: string | null;
  notes: string | null;
  tenders: NoticeTender[];
  source: NoticeSource | null;
};

export type TenderNoticeParams = ListParams & {
  status?: NoticeStatus;
  source_id?: number;
};

export type ExtractionResult = {
  notice_id: number;
  status: NoticeStatus;
  method: string;
  confidence: string;
  tender_count: number;
  item_count: number;
  matched_count: number;
  /** Non-fatal: a scanned PDF, a duplicate tender, nothing recognised. */
  warnings: string[];
};

export type NoticeConfirmResult = {
  notice_id: number;
  status: NoticeStatus;
  tenders_confirmed: number;
  shortlisted: number;
  detail: string;
};

export type TenderItemMappingInput = {
  product_id?: number | null;
  skip?: boolean;
};

export type NoticeTenderUpdateInput = Partial<{
  name: string;
  reference_no: string;
  notice_date: string | null;
  tender_type: TenderType | null;
  closing_date: string | null;
  closing_time: string | null;
  opening_date: string | null;
  opening_time: string | null;
  schedule_cost: string | null;
  schedule_currency: string | null;
  schedule_cost_usd: string | null;
  buyer_name: string | null;
}>;

// --- Supplier mail (Gmail mailbox module) -----------------------------------
// Distinct from the Resend path that sends invites and password resets. This
// is mail sent as a person, from the client's own address, that expects a
// reply. `needs_reauth` is an EXPECTED weekly state, not an error: the mailbox
// is a consumer @gmail.com on a Testing-mode OAuth app, so refresh tokens
// expire every 7 days.

export type MailboxStatus = "connected" | "needs_reauth" | "disconnected";

export type MailboxAccount = {
  id: number;
  provider: string;
  email_address: string;
  display_name: string | null;
  status: MailboxStatus;
  granted_scopes: string[] | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  connected_at: string | null;
};

export type MailboxSettings = {
  /** Server has GMAIL_CLIENT_ID/SECRET set. */
  configured: boolean;
  /** False means MAILBOX_TOKEN_KEY is unset and tokens sit in plaintext. */
  tokens_encrypted: boolean;
  account: MailboxAccount | null;
  /** Only true when connected AND holding the send scope. */
  can_send: boolean;
  reauth_due_at: string | null;
  days_until_reauth: number | null;
};

export type MailAttachment = {
  id: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  /** Signature logos and the like — hidden by default in the thread view. */
  is_inline: boolean;
};

export type MailMessage = {
  id: number;
  direction: CommunicationDirection;
  occurred_at: string;
  subject: string | null;
  body: string | null;
  counterparty: string | null;
  external_id: string | null;
  external_thread_id: string | null;
  has_attachments: boolean;
  attachments: MailAttachment[];
};

export type MailThread = {
  thread_id: string | null;
  messages: MailMessage[];
};

export type InquiryDraft = {
  to: string[];
  subject: string;
  body: string;
  /** Set when continuing an existing conversation rather than starting one. */
  thread_id: string | null;
  /** Non-fatal gaps — no address on file, no quantity set. */
  warnings: string[];
};

/** POST /mailbox/inquiry-preview — the same email the draft endpoint builds,
 *  rendered for an enquiry that has not been filed yet. Mirrors the sourcing
 *  request's own fields rather than referencing a row id. */
export type InquiryPreviewInput = {
  product_id: number;
  company_id: number;
  contact_person_id?: number | null;
  /** Set when the enquiry is already filed and this is a follow-up: the
   *  preview then comes back carrying that request's thread and a "Re:"
   *  subject. Omitted from the tender board, where nothing is filed yet. */
  sourcing_request_id?: number | null;
  required_quantity?: string | null;
  quantity_unit?: string | null;
  required_specification?: string | null;
  required_packing?: string | null;
  required_documents?: string[] | null;
  /** Written for the supplier to read — goes into the body verbatim. */
  notes?: string | null;
};

export type MailSendInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  thread_id?: string | null;
};

export type MailSyncResult = {
  synced: number;
  threads_checked: number;
  last_synced_at: string | null;
  /** A partial sync still commits what it imported, so this rides on a 200. */
  error: string | null;
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
  /** How many of `count` are waiting on us. Always a subset, which is what
   *  lets a stage card badge it without ever exceeding its own number. */
  awaiting_us: number;
};

/**
 * What is waiting on the buyer right now, across every live request.
 *
 * A breakdown rather than one number, because "6 need attention" is not
 * actionable and "3 replies, 2 overdue follow-ups, 1 quotation" is. The three
 * can overlap on one request, so `total` counts reasons, not requests.
 */
export type SourcingAttention = {
  awaiting_reply: number;
  overdue_follow_ups: number;
  unreviewed_quotations: number;
  total: number;
};

export type SourcingPipeline = {
  columns: SourcingPipelineColumn[];
  total: number;
  attention: SourcingAttention;
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

/* -------------------------------------------------------------------------
 * Account settings (SRS FR-AUTH extension, 2026-08-22)
 * ---------------------------------------------------------------------- */

export type TwoFactorSetup = {
  secret: string;
  otpauth_url: string;
  qr_data_uri: string;
};

export type RecoveryCodes = {
  codes: string[];
};

/** One device — the backend already collapses repeat logins from the same
 *  browser into a single row (`AuthService._dedupe_by_device`). */
export type AccountSession = {
  id: number;
  device: string;
  ip: string | null;
  created_at: string;
  expires_at: string;
  is_current: boolean;
};

/* -------------------------------------------------------------------------
 * Admin: user management + audit trail (SRS FR-ADM extension, 2026-08-23)
 * ---------------------------------------------------------------------- */

/** An owner's view of someone else's account — distinct from `AuthUser`
 *  (`lib/auth.tsx`), which is exclusively the signed-in user's own. */
export type AdminUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type AdminUserListParams = ListParams & {
  role?: UserRole;
  is_active?: boolean;
};

export type CreateUserInput = {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
};

/** Same shape as `AdminUser` plus whether the invite email actually sent
 *  (false when Resend isn't configured or the send failed — the admin
 *  still has the temp password on screen to share manually either way). */
export type CreateUserResult = AdminUser & { invite_email_sent: boolean };

/** One raw `activity_log` row for the admin Activity Logs page — every
 *  entity type, `changes` shown as-is (unlike the narrated `ActivityEntry`
 *  the dashboard/tender sidebars use). */
export type AuditLogEntry = {
  id: number;
  occurred_at: string;
  action: ActivityAction;
  entity_type: string;
  entity_id: number | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  user_id: number | null;
  user_name: string | null;
};

export type AuditLogParams = ListParams & {
  user_id?: number;
  entity_type?: string;
  action?: ActivityAction;
  since?: string;
  until?: string;
};

/* -------------------------------------------------------------------------
 * Notifications
 * ---------------------------------------------------------------------- */

export type NotificationKind =
  | "supplier_replied"
  /** Any new mail in the connected mailbox, including senders the ERP has
   *  never seen. Kept apart from `supplier_replied` so the higher-signal
   *  enquiry reply keeps its own icon — and so this one can be muted alone. */
  | "inbox_mail"
  | "follow_up_due"
  | "status_changed";

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string | null;
  /** A loose (type, id) pair the client turns into a route. Both null when the
   *  notification is not about anything clickable. */
  entity_type: string | null;
  entity_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type UnreadCount = { unread: number };

export type MarkAllReadResult = { marked: number };

// --- Inbox (2026-08-31) ------------------------------------------------------
//
// The mailbox module reads the client's own Gmail here, rather than only the
// threads the ERP started. Two things follow, and both are visible in these
// types:
//
//   * Nothing in an inbox row has an ERP id, because nothing has been stored.
//     Messages are addressed by their Gmail ids and are recomputed on every
//     read — the client's personal mail is rendered and forgotten, and only a
//     reply or an explicit "file" turns a thread into communications.
//   * Every row carries the bucket it was sorted into AND the reason. The
//     reason is shown in the UI on purpose: the filter is plain logic, not a
//     model, and the buyer's correction is the only thing that improves it.

/** business = recognised sender, unsorted = a stranger (shown, never hidden),
 *  filtered = bulk or promotional mail. */
export type InboxBucket = "business" | "unsorted" | "filtered";

export type InboxMessage = {
  message_id: string;
  thread_id: string;
  from_address: string | null;
  from_name: string | null;
  subject: string | null;
  /** Gmail's own preview text — cheaper than fetching the body. */
  snippet: string | null;
  received_at: string | null;
  is_unread: boolean;
  has_attachments: boolean;
  bucket: InboxBucket;
  /** "Known supplier domain (xyzpharma.cn)", "Gmail category: Promotions". */
  bucket_reason: string;
  company_id: number | null;
  company_name: string | null;
  /** Already recorded in the ERP — an inquiry we sent, or a filed thread. */
  in_erp: boolean;
};

export type InboxPage = {
  messages: InboxMessage[];
  next_page_token: string | null;
  /** Counts describe the window that was fetched, not the whole mailbox —
   *  Gmail cannot count a query's matches without walking it. */
  counts: Record<string, number>;
  scanned: number;
};

export type InboxAttachment = {
  part_id: string;
  attachment_id: string | null;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_inline: boolean;
};

export type InboxThreadMessage = {
  message_id: string;
  thread_id: string;
  direction: CommunicationDirection;
  from_address: string | null;
  from_name: string | null;
  to_addresses: string[];
  subject: string | null;
  body: string | null;
  occurred_at: string | null;
  attachments: InboxAttachment[];
};

export type InboxThread = {
  thread_id: string;
  messages: InboxThreadMessage[];
  sourcing_request_id: number | null;
  company_id: number | null;
  company_name: string | null;
};

/** POST /mailbox/inbox/send — an email belonging to no tender and no request. */
export type DirectSendInput = MailSendInput & {
  company_id?: number | null;
  contact_person_id?: number | null;
};

export type ThreadFiled = {
  thread_id: string;
  messages_recorded: number;
  company_id: number | null;
};

/** One triage decision, and the filter's entire memory. This is what stands in
 *  for a trained model: inspectable, reversible, and the client's own. */
export type SenderRule = {
  id: number;
  pattern: string;
  is_domain: boolean;
  is_business: boolean;
  company_id: number | null;
  company_name: string | null;
  note: string | null;
  created_at: string | null;
};

export type SenderRuleInput = {
  pattern: string;
  is_domain: boolean;
  is_business: boolean;
  company_id?: number | null;
  note?: string | null;
};
