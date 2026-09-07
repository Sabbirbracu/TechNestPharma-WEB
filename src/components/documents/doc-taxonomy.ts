import type { DocType, DocumentTarget } from "@/types/api";

/**
 * What each `doc_type` is called, and which family it belongs to.
 *
 * Twenty-one types is too many to show as a flat row of filter chips, so they
 * are grouped by the question they answer: is the material right (Quality), is
 * the supplier allowed to make it (Regulatory), what has been audited or
 * certified (Certifications), and what did they send us (Commercial). The
 * families are a UI device only — the wire format is always the flat
 * `doc_type`, and grouping here rather than in the API keeps the backend from
 * having an opinion about how a page is laid out.
 *
 * `label` is deliberately the short form a sourcing desk says out loud: "COA",
 * not "Certificate of Analysis". `description` carries the long form for the
 * places that have room for it.
 */

export type DocFamily =
  | "supplier"
  | "regulatory"
  | "quality"
  | "commercial"
  | "tender"
  | "other";

export const DOC_FAMILIES: { value: DocFamily; label: string }[] = [
  { value: "supplier", label: "Supplier" },
  { value: "regulatory", label: "Regulatory" },
  { value: "quality", label: "Quality" },
  { value: "commercial", label: "Commercial" },
  { value: "tender", label: "Tender" },
  { value: "other", label: "Other" },
];

export type DocTypeMeta = {
  value: DocType;
  /** The short form said out loud — "COA", not "Certificate of Analysis". */
  label: string;
  /** The spelled-out name, used as the subtitle under a filename in the table.
   *  Short enough to sit on one line at any column width. */
  fullName: string;
  /** The long form, for the places with room to explain. */
  description: string;
  family: DocFamily;
};

export const DOC_TYPES: DocTypeMeta[] = [

  // Supplier — who they are and what they sell.
  {
    value: "brochure",
    label: "Brochure",
    fullName: "Company Brochure",
    description: "Company or product marketing material",
    family: "supplier",
  },
  {
    value: "company_profile",
    label: "Company Profile",
    fullName: "Company Profile",
    description: "Who the supplier is, and what they make",
    family: "supplier",
  },
  {
    value: "business_card",
    label: "Business Card",
    fullName: "Business Card",
    description: "Scanned or photographed card",
    family: "supplier",
  },
  {
    value: "price_list",
    label: "Price List",
    fullName: "Product Price List",
    description: "Quoted prices, usually with validity dates",
    family: "supplier",
  },
  {
    value: "product_catalogue",
    label: "Catalogue",
    fullName: "Product Catalogue",
    description: "The supplier's full product list",
    family: "supplier",
  },
  {
    value: "letter",
    label: "Letter",
    fullName: "Letter",
    description: "Correspondence kept as a record",
    family: "supplier",
  },

  // Regulatory — is this supplier allowed to make it, and for whom?
  {
    value: "cep_certificate",
    label: "CEP",
    fullName: "CEP Certificate",
    description: "Certificate of Suitability to the European Pharmacopoeia",
    family: "regulatory",
  },
  {
    value: "dmf_letter",
    label: "DMF",
    fullName: "Drug Master File",
    description: "Drug Master File letter of access",
    family: "regulatory",
  },
  {
    value: "plant_master_file",
    label: "PMF",
    fullName: "Plant Master File",
    description: "Plant Master File",
    family: "regulatory",
  },
  {
    value: "site_master_file",
    label: "SMF",
    fullName: "Site Master File",
    description: "Site Master File",
    family: "regulatory",
  },
  {
    value: "gmp_certificate",
    label: "GMP",
    fullName: "GMP Certificate",
    description: "Good Manufacturing Practice certificate",
    family: "regulatory",
  },
  {
    value: "regulatory_certificate",
    label: "Regulatory",
    fullName: "Regulatory Certificate",
    description: "A regulator's certificate not covered by the types above",
    family: "regulatory",
  },
  {
    value: "drug_authority_certificate",
    label: "Drug Authority",
    fullName: "Drug Authority Certificate",
    description: "Local regulator's certificate or registration",
    family: "regulatory",
  },
  {
    value: "license",
    label: "Licence",
    fullName: "Licence",
    description: "A manufacturing, import or trade licence",
    family: "regulatory",
  },
  {
    value: "tse_bse_statement",
    label: "TSE/BSE",
    fullName: "TSE/BSE Statement",
    description: "Transmissible spongiform encephalopathy declaration",
    family: "regulatory",
  },
  {
    value: "halal_certificate",
    label: "Halal",
    fullName: "Halal Certificate",
    description: "Halal certificate for this material",
    family: "regulatory",
  },
  {
    value: "kosher_certificate",
    label: "Kosher",
    fullName: "Kosher Certificate",
    description: "Kosher certificate for this material",
    family: "regulatory",
  },
  {
    value: "audit_report",
    label: "Audit Report",
    fullName: "Audit Report",
    description: "Findings from a site or supplier audit",
    family: "regulatory",
  },

  // Quality — is this material what it claims to be?
  {
    value: "coa",
    label: "COA",
    fullName: "Certificate of Analysis",
    description: "Certificate of analysis for a specific batch",
    family: "quality",
  },
  {
    value: "test_report",
    label: "Test Report",
    fullName: "Laboratory Test Report",
    description: "Qualitative, quantitative or microbiological results",
    family: "quality",
  },
  {
    value: "specification",
    label: "Specification",
    fullName: "Product Specification",
    description: "The agreed spec the material is made and tested against",
    family: "quality",
  },
  {
    value: "technical_data_sheet",
    label: "TDS",
    fullName: "Technical Data Sheet",
    description: "Physical and handling properties of the material",
    family: "quality",
  },
  {
    value: "msds",
    label: "MSDS",
    fullName: "Material Safety Data Sheet",
    description: "Material safety data sheet",
    family: "quality",
  },
  {
    value: "compendial_monograph",
    label: "Compendial Reference",
    fullName: "Compendial Reference",
    description: "BP, USP, EP or JP monograph pages",
    family: "quality",
  },
  {
    value: "leaflet_photo",
    label: "Leaflet",
    fullName: "Product Leaflet",
    description: "A photographed leaflet, usually from an import",
    family: "quality",
  },

  // Commercial — the paperwork a purchase runs on.
  {
    value: "quotation",
    label: "Quotation",
    fullName: "Supplier Quotation",
    description: "A supplier's priced response to an inquiry",
    family: "commercial",
  },
  {
    value: "proforma_invoice",
    label: "Proforma",
    fullName: "Proforma Invoice",
    description: "A priced invoice issued before shipment",
    family: "commercial",
  },
  {
    value: "invoice",
    label: "Invoice",
    fullName: "Invoice",
    description: "A commercial invoice against a shipment",
    family: "commercial",
  },
  {
    value: "purchase_order",
    label: "Purchase Order",
    fullName: "Purchase Order",
    description: "An order raised with a supplier",
    family: "commercial",
  },
  {
    value: "contract",
    label: "Contract",
    fullName: "Contract",
    description: "A signed agreement with a supplier",
    family: "commercial",
  },

  // Tender — the parts of a published tender.
  {
    value: "tender_notice",
    label: "Tender Notice",
    fullName: "Tender Notice",
    description: "A saved copy of a published tender notice",
    family: "tender",
  },
  {
    value: "tender_specification",
    label: "Tender Spec",
    fullName: "Tender Specification",
    description: "What a tender requires of the material",
    family: "tender",
  },
  {
    value: "tender_schedule",
    label: "Tender Schedule",
    fullName: "Tender Schedule",
    description: "Dates, quantities and lots for a tender",
    family: "tender",
  },
  {
    value: "tender_attachment",
    label: "Tender Attachment",
    fullName: "Tender Attachment",
    description: "Any other file published with a tender",
    family: "tender",
  },
  {
    value: "tender_result",
    label: "Tender Result",
    fullName: "Tender Result",
    description: "The published outcome of a tender",
    family: "tender",
  },

  // Other.
  {
    value: "other",
    label: "Other",
    fullName: "Other Document",
    description: "Anything the list above does not describe",
    family: "other",
  },
];

const BY_VALUE = new Map(DOC_TYPES.map((type) => [type.value, type]));

/** Never throws on an unknown value: a type added to the backend enum before
 *  this file catches up must still render as something readable rather than
 *  blanking the cell. */
export function docTypeMeta(value: DocType): DocTypeMeta {
  return (
    BY_VALUE.get(value) ?? {
      value,
      fullName: String(value).replace(/_/g, " "),
      label: String(value).replace(/_/g, " "),
      description: "",
      family: "other",
    }
  );
}

export function docTypesInFamily(family: DocFamily): DocType[] {
  return DOC_TYPES.filter((type) => type.family === family).map(
    (type) => type.value,
  );
}

/** Family chip colours. Sequential per family rather than per type — twenty-one
 *  colours would be noise, and the type's own name is what identifies it. */
export const FAMILY_CHIP: Record<DocFamily, string> = {
  supplier: "bg-tile-teal-bg text-tile-teal",
  regulatory: "bg-tile-purple-bg text-tile-purple",
  quality: "bg-tile-blue-bg text-tile-blue",
  commercial: "bg-tile-amber-bg text-tile-amber",
  tender: "bg-tile-rose-bg text-tile-rose",
  other: "bg-tile-green-bg text-tile-green",
};

/** What a document can be filed against, as the UI says it. */
export const TARGET_LABELS: Record<DocumentTarget, string> = {
  company: "Supplier",
  contact: "Contact",
  product: "Product",
  offer: "Offer",
  sample: "Sample",
  sourcing: "Inquiry",
  notice: "Tender",
  quotation: "Quotation",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The chip colour for a type badge in the library table.
 *
 * Per type rather than per family: the mockup gives COA, DMF and Test Report
 * their own colours, and at a glance down a column the badge colour is what
 * separates "this batch has a COA" from "this batch has a price list". The
 * text on every chip states the type, so colour is reinforcement, never the
 * only carrier of meaning.
 */
export const TYPE_CHIP: Record<string, string> = {
  coa: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/25",
  test_report:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/25",
  specification:
    "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/12 dark:text-teal-300 dark:ring-teal-400/25",
  compendial_monograph:
    "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/12 dark:text-teal-300 dark:ring-teal-400/25",
  dmf_letter:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/25",
  site_master_file:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/25",
  plant_master_file:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/25",
  cep_certificate:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/25",
  gmp_certificate:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/25",
  drug_authority_certificate:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/25",
  tse_bse_statement:
    "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/12 dark:text-orange-300 dark:ring-orange-400/25",
  msds: "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/12 dark:text-orange-300 dark:ring-orange-400/25",
  halal_certificate:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/12 dark:text-green-300 dark:ring-green-400/25",
  kosher_certificate:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/12 dark:text-green-300 dark:ring-green-400/25",
  audit_report:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/25",
  price_list:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/25",
  brochure:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/12 dark:text-blue-300 dark:ring-blue-400/25",
  product_catalogue:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/12 dark:text-blue-300 dark:ring-blue-400/25",
  leaflet_photo:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/12 dark:text-blue-300 dark:ring-blue-400/25",
  quotation:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  tender_notice:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/12 dark:text-purple-300 dark:ring-purple-400/25",
  company_profile:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/25",
  letter:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-300 dark:ring-slate-400/25",
  regulatory_certificate:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/25",
  license:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/25",
  technical_data_sheet:
    "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/12 dark:text-teal-300 dark:ring-teal-400/25",
  proforma_invoice:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  invoice:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  purchase_order:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  contract:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  tender_specification:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/12 dark:text-purple-300 dark:ring-purple-400/25",
  tender_schedule:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/12 dark:text-purple-300 dark:ring-purple-400/25",
  tender_attachment:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/12 dark:text-purple-300 dark:ring-purple-400/25",
  tender_result:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/12 dark:text-purple-300 dark:ring-purple-400/25",
  business_card:
    "bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-500/12 dark:text-pink-300 dark:ring-pink-400/25",
  other:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-300 dark:ring-slate-400/25",
};

export function typeChip(value: string): string {
  return TYPE_CHIP[value] ?? TYPE_CHIP.other;
}

/** Where a document came from, as the page says it. */
export const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  email: "Email",
  tender: "Tender",
  import: "Import",
  sourcing: "Sourcing",
  quotation: "Quotation",
  purchase_order: "Purchase Order",
  system: "System",
};

export const SOURCE_CHIP: Record<string, string> = {
  email:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/12 dark:text-blue-300 dark:ring-blue-400/25",
  manual:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-300 dark:ring-slate-400/25",
  tender:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/25",
  import:
    "bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/25",
  sourcing:
    "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/12 dark:text-teal-300 dark:ring-teal-400/25",
  quotation:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  purchase_order:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/12 dark:text-indigo-300 dark:ring-indigo-400/25",
  system:
    "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-300 dark:ring-slate-400/25",
};

/** A deterministic avatar tint for an uploader, so the same person keeps the
 *  same colour down the column and across page loads. */
const AVATAR_TINTS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
];

export function avatarTint(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
