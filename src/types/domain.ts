/**
 * Domain enums, mirrored from the Postgres enum types in
 * 05-architecture-and-schema.md §B2. Keep in sync with the backend; when the
 * OpenAPI-generated Zod schemas land (§A3) these become the source of truth.
 */

export type UserRole = "owner" | "staff" | "viewer";

export type CompanyType =
  | "manufacturer"
  | "trader"
  | "manufacturer_trader"
  | "agent";

export type CompanyStatus = "active" | "inactive" | "blacklisted";

export type LeadSource =
  | "trade_fair"
  | "referral"
  | "email"
  | "web"
  | "existing_relationship"
  | "other";

export type MaterialType =
  | "api"
  | "intermediate"
  | "excipient"
  | "packaging_material"
  | "finished_product"
  | "semi_finished_product"
  | "vitamin"
  | "amino_acid"
  | "plant_extract"
  | "food_additive"
  | "solvent"
  | "enzyme"
  | "cosmetic_ingredient"
  | "other";

export type MarketSegment = "human" | "veterinary" | "both";

export type ApplicationType =
  | "oral"
  | "injection"
  | "topical"
  | "inhalation"
  | "ophthalmic"
  | "biological"
  | "general";

export type CommercialStatus =
  | "commercial"
  | "registered"
  | "validation"
  | "pilot"
  | "rnd"
  | "patent_rnd_only";

export type ProductRelation =
  | "api"
  | "intermediate_of"
  | "salt_of"
  | "grade_of"
  | "hydrate_of"
  | "polymorph_of";

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

export type EmailPurpose =
  | "general"
  | "api_sales"
  | "fpp_sales"
  | "quality"
  | "regulatory"
  | "logistics";

export type SynonymType =
  | "inn"
  | "usan"
  | "brand"
  | "chemical"
  | "local"
  | "misspelling";

export type FilingType =
  | "usdmf"
  | "cep"
  | "jdmf"
  | "kdmf"
  | "cdmf"
  | "cn_registration"
  | "written_confirmation"
  | "copp"
  | "who_pq"
  | "other";

export type FilingStatus =
  | "available"
  | "under_review"
  | "planned"
  | "not_available";

export type CertType =
  | "who_gmp"
  | "eu_gmp"
  | "us_fda"
  | "national_gmp"
  | "iso_9001"
  | "iso_14001"
  | "iso_45001"
  /** GMP for primary pharmaceutical packaging — the screening credential for
   *  stopper, foil, and container suppliers. Not applicable to secondary
   *  packaging such as shrink film. */
  | "iso_15378"
  | "kosher"
  | "halal"
  | "other";

/** The seven packaging families sourced from China (2026-08). Discriminates
 *  which columns of a product's packaging spec are meaningful. */
export type PackagingType =
  | "rubber_stopper"
  | "flip_off_seal"
  /** "Pharma outer wrap" — POF shrink film. Secondary packaging. */
  | "shrink_film"
  | "eye_container"
  | "aluminium_foil"
  | "pvc_film"
  | "sterilized_cotton"
  | "other";

export type SterilizationMethod = "none" | "eo" | "gamma" | "e_beam" | "steam";

export type CertStatus = "valid" | "expired" | "suspended" | "unknown";

export type SampleStatus =
  | "requested"
  | "promised"
  | "shipped"
  | "received"
  | "under_test"
  | "approved"
  | "rejected"
  | "cancelled";

export type SampleTestResult = "pass" | "fail" | "conditional";

export type DocType =
  | "brochure"
  | "product_catalogue"
  | "coa"
  | "specification"
  | "msds"
  | "gmp_certificate"
  | "dmf_letter"
  | "cep_certificate"
  | "business_card"
  | "price_list"
  | "audit_report"
  | "leaflet_photo"
  | "other";

export type ImportStatus =
  | "uploaded"
  | "parsed"
  | "previewed"
  | "committed"
  | "failed"
  | "rolled_back";

export type ImportSource = "csv" | "excel" | "leaflet_ocr";

/** Sample-request state machine (SRS FR-SAMP-02); enforced server-side. */
export const SAMPLE_TRANSITIONS: Record<SampleStatus, SampleStatus[]> = {
  requested: ["promised", "cancelled"],
  promised: ["shipped", "cancelled"],
  shipped: ["received", "cancelled"],
  received: ["under_test", "cancelled"],
  under_test: ["approved", "rejected", "cancelled"],
  approved: [],
  rejected: [],
  cancelled: [],
};
