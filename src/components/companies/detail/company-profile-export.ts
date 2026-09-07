import { apiFetch } from "@/lib/api";
import { csvField, downloadCsv } from "@/components/companies/company-export";
import type { CompanyDetail, OfferListItem, Page } from "@/types/api";

/**
 * "Download Profile" — one supplier, everything we hold on them, in the format
 * the sourcing desk already lives in.
 *
 * A three-block CSV rather than three files: the profile, the people, and the
 * catalogue are read together (who do we call about which product), and one
 * attachment survives being forwarded in a way three do not.
 */

const CATALOGUE_PAGE_SIZE = 100;
const MAX_PAGES = 30;

async function fetchOffers(companyId: number): Promise<OfferListItem[]> {
  const rows: OfferListItem[] = [];
  let page = 1;
  let pages = 1;

  do {
    const result = await apiFetch<Page<OfferListItem>>(
      `/offers?company_id=${companyId}&page=${page}&size=${CATALOGUE_PAGE_SIZE}`,
    );
    rows.push(...result.items);
    pages = result.pages;
    page += 1;
  } while (page <= pages && page <= MAX_PAGES);

  return rows;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "company"
  );
}

export function profileToCsv(
  company: CompanyDetail,
  offers: OfferListItem[],
): string {
  const lines: string[] = [];

  lines.push("Company Profile");
  const fields: [string, string | null | undefined][] = [
    ["Name", company.name_en],
    ["Chinese Name", company.name_cn],
    ["Short Name", company.short_name],
    ["Type", company.company_type],
    ["Status", company.status],
    ["Country", company.country?.name],
    ["City", company.city],
    ["Address", company.address],
    ["Website", company.website],
    ["Lead Source", company.lead_source],
    ["Watchlisted", company.is_watchlisted ? "Yes" : "No"],
    ["Notes", company.notes],
  ];
  for (const [label, value] of fields) {
    lines.push([csvField(label), csvField(value)].join(","));
  }

  lines.push("");
  lines.push("Contacts");
  lines.push(
    ["Name", "Designation", "Department", "Primary", "Channels"]
      .map(csvField)
      .join(","),
  );
  for (const contact of company.contacts) {
    lines.push(
      [
        csvField(contact.name_en),
        csvField(contact.designation),
        csvField(contact.department),
        csvField(contact.is_primary ? "Yes" : "No"),
        csvField(
          contact.channels.map((ch) => `${ch.channel}: ${ch.value}`).join(" | "),
        ),
      ].join(","),
    );
  }

  lines.push("");
  lines.push("Product Catalogue");
  lines.push(
    [
      "Product",
      "CAS",
      "Specification",
      "Indication / Use",
      "Therapeutic Class",
      "Qualification / Approval",
      "Packing / Details",
    ]
      .map(csvField)
      .join(","),
  );
  for (const offer of offers) {
    lines.push(
      [
        csvField(offer.product?.name_en),
        csvField(offer.product?.cas_number),
        csvField(offer.spec_text),
        csvField(offer.product?.indication_text),
        csvField(offer.product?.therapeutic_classes.join(" | ")),
        csvField(offer.qualification_text),
        csvField(offer.packing_text),
      ].join(","),
    );
  }

  return lines.join("\r\n");
}

export async function downloadCompanyProfile(
  company: CompanyDetail,
): Promise<void> {
  const offers = await fetchOffers(company.id);
  downloadCsv(
    profileToCsv(company, offers),
    `${slug(company.name_en)}-profile-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
