"use client";

import { Select } from "@/components/ui/select";
import { useCompanies, useProducts } from "@/lib/queries";
import type { DocType, DocumentTarget } from "@/types/api";
import { DOC_FAMILIES, DOC_TYPES, docTypeMeta } from "./doc-taxonomy";

/**
 * The metadata a document carries: what it is, and what it is about.
 *
 * The "Related to" picker is **driven by the type**, not shown in full. A
 * quotation is about a supplier and a product; a tender notice is about a
 * tender and neither of the other two. Showing all eight targets on every form
 * would make the common case — pick a type, pick a supplier, save — look like a
 * data-entry screen, and most of the fields would be left empty anyway.
 *
 * Only one link is set here. A document filed against a second thing gets that
 * from the table's own menu, which is where a *correction* belongs; making the
 * upload form handle it would put a rare case in front of every user.
 */

export type DocumentMetadata = {
  docType: DocType;
  target: DocumentTarget | "";
  targetId: string;
  notes: string;
};

export const EMPTY_METADATA: DocumentMetadata = {
  docType: "other",
  target: "",
  targetId: "",
  notes: "",
};

/** Which target a type is normally about. The form offers this one first and
 *  lets the user override it, rather than making them work it out. */
export function defaultTargetFor(docType: DocType): DocumentTarget {
  const family = docTypeMeta(docType).family;
  if (family === "tender") return "notice";
  if (docType === "quotation") return "sourcing";
  // Everything else is evidence about a material or the company that makes it;
  // a supplier is the answer that is always available, so it leads.
  if (family === "quality") return "product";
  return "company";
}

const TARGET_OPTIONS: { value: DocumentTarget; label: string }[] = [
  { value: "company", label: "Supplier" },
  { value: "product", label: "Product" },
  { value: "offer", label: "Offer (supplier + product)" },
  { value: "sourcing", label: "Inquiry" },
  { value: "quotation", label: "Quotation" },
  { value: "sample", label: "Sample" },
  { value: "notice", label: "Tender notice" },
  { value: "contact", label: "Contact" },
];

export function DocumentMetadataFields({
  value,
  onChange,
  idPrefix,
  presetTargetLabel = null,
}: {
  value: DocumentMetadata;
  onChange: (next: DocumentMetadata) => void;
  idPrefix: string;
  /** Names a target the caller has already chosen, for the six that have no
   *  inline picker. Without it those read "file it from its own page" even
   *  when it is *already* filed there — which is what a save opened from an
   *  enquiry's own conversation looks like. */
  presetTargetLabel?: string | null;
}) {
  // Only the two pickers with a manageable option list are inline. The other
  // six targets are set from the entity's own page, where the thing being
  // linked is already on screen.
  const suppliers = useCompanies({ size: 100, sort: "name_en", order: "asc" });
  const products = useProducts({ size: 100, sort: "name_en", order: "asc" });

  const pickable = value.target === "company" || value.target === "product";
  const options =
    value.target === "company"
      ? (suppliers.data?.items ?? []).map((item) => ({
          id: item.id,
          name: item.name_en,
        }))
      : value.target === "product"
        ? (products.data?.items ?? []).map((item) => ({
            id: item.id,
            name: item.name_en,
          }))
        : [];

  function set<K extends keyof DocumentMetadata>(
    key: K,
    next: DocumentMetadata[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1.5" htmlFor={`${idPrefix}-type`}>
        <span className="block text-xs font-semibold text-muted-foreground">
          Document type
        </span>
        <Select
          id={`${idPrefix}-type`}
          value={value.docType}
          onChange={(event) => {
            const docType = event.target.value as DocType;
            // Re-point the link at whatever this type is normally about, and
            // clear the id — a product id is meaningless once the target is a
            // tender.
            onChange({
              ...value,
              docType,
              target: defaultTargetFor(docType),
              targetId: "",
            });
          }}
        >
          {DOC_FAMILIES.map((family) => (
            <optgroup key={family.value} label={family.label}>
              {DOC_TYPES.filter((type) => type.family === family.value).map(
                (type) => (
                  <option key={type.value} value={type.value}>
                    {type.fullName}
                  </option>
                ),
              )}
            </optgroup>
          ))}
        </Select>
      </label>

      <label className="space-y-1.5" htmlFor={`${idPrefix}-target`}>
        <span className="block text-xs font-semibold text-muted-foreground">
          File it against
        </span>
        <Select
          id={`${idPrefix}-target`}
          value={value.target}
          onChange={(event) =>
            onChange({
              ...value,
              target: event.target.value as DocumentTarget | "",
              targetId: "",
            })
          }
        >
          <option value="">Nothing yet</option>
          {TARGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      {value.target !== "" && (
        <label className="space-y-1.5 sm:col-span-2" htmlFor={`${idPrefix}-which`}>
          <span className="block text-xs font-semibold text-muted-foreground">
            Which one
          </span>
          {pickable ? (
            <Select
              id={`${idPrefix}-which`}
              value={value.targetId}
              onChange={(event) => set("targetId", event.target.value)}
            >
              <option value="">Choose…</option>
              {options.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name}
                </option>
              ))}
            </Select>
          ) : presetTargetLabel && value.targetId ? (
            // Already decided by where this was opened from. Shown rather than
            // hidden, so the person saving can see where it is going.
            <p className="rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-xs font-semibold text-foreground">
              {presetTargetLabel}
            </p>
          ) : (
            // No picker for the other six: an inquiry, quotation, sample,
            // offer, notice or contact is chosen from its own screen, where
            // there is enough context to tell two of them apart. Filing one
            // from here would be picking a number out of a list of numbers.
            <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
              Upload it now and file it from the{" "}
              {TARGET_OPTIONS.find((o) => o.value === value.target)?.label.toLowerCase()}
              &rsquo;s own page — there is enough context there to pick the right
              one.
            </p>
          )}
        </label>
      )}

      <label className="space-y-1.5 sm:col-span-2" htmlFor={`${idPrefix}-notes`}>
        <span className="block text-xs font-semibold text-muted-foreground">
          Notes <span className="font-medium opacity-70">(optional)</span>
        </span>
        <textarea
          id={`${idPrefix}-notes`}
          value={value.notes}
          onChange={(event) => set("notes", event.target.value)}
          rows={2}
          placeholder="Why this is worth keeping — batch, validity, what it supersedes…"
          className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        />
      </label>
    </div>
  );
}
