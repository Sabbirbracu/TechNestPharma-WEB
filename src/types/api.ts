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
};

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
  company_id: number;
  company_name: string;
  company_name_cn: string | null;
  country: string | null;
  city: string | null;
  contact: SearchContact | null;
  /** Set only when the company has no named contact person. */
  fallback_email: string | null;
  /** This supplier's own spec — can differ between suppliers of the same product. */
  specification: string | null;
  qualification: string | null;
  packing: string | null;
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
};

/** PATCH /offers/{id} — every field optional. */
export type OfferUpdateInput = Partial<
  Omit<OfferCreateInput, "company_id" | "product_id">
>;

export type OfferListParams = ListParams & {
  company_id?: number;
  product_id?: number;
};
