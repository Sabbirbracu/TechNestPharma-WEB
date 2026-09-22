"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  FileText,
  Loader2,
  Mail,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  isMailboxReauthError,
  useComposeInquiry,
  useContacts,
  useGroupedInquiryDraft,
  useInquiryComposePreview,
  useMailboxSettings,
  useSendGroupedInquiry,
  useSupplierTenderMatches,
} from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  InquiryComposeItem,
  InquiryComposePreviewInput,
  MailboxSettings,
  SupplierTenderMatch,
} from "@/types/api";

/**
 * One product that can be included in this supplier enquiry.
 * 
 * Represents a product-tender-supplier match discovered by the backend.
 */
export type EnquiryProduct = {
  /** Unique key for this product within the dialog */
  key: string;
  productId: number;
  productName: string;
  casNumber: string | null;
  tenderId: number;
  tenderReference: string;
  /** True if this supplier already has an open request for this product */
  alreadyRequested: boolean;
  /** If already requested, the sourcing request to deep-link to */
  existingRequestId?: number | null;
  /** Default quantity and unit from the tender line */
  defaultQuantity?: string | null;
  defaultQuantityUnit?: string | null;
  /** Supplier-specific product specs */
  specification?: string | null;
  packing?: string | null;
  supplierProductId?: number | null;
};

/**
 * Product that has been selected and moved into "Products to inquire"
 */
type SelectedProduct = {
  product: EnquiryProduct;
  quantity: string;
  quantityUnit: string;
};

/**
 * What the supplier is asked for. Every ticked box is a line in the email.
 */
const CHECKLIST: {
  value: string;
  label: string;
  group: "terms" | "documents";
  defaultChecked: boolean;
}[] = [
  { value: "price", label: "Price", group: "terms", defaultChecked: true },
  { value: "moq", label: "MOQ", group: "terms", defaultChecked: true },
  { value: "packing", label: "Packing", group: "terms", defaultChecked: true },
  { value: "lead_time", label: "Lead time", group: "terms", defaultChecked: true },
  { value: "incoterm", label: "Incoterm & port", group: "terms", defaultChecked: true },
  { value: "payment_terms", label: "Payment terms", group: "terms", defaultChecked: true },
  { value: "validity", label: "Price validity", group: "terms", defaultChecked: true },
  { value: "sample", label: "Sample", group: "terms", defaultChecked: false },
  { value: "coa", label: "COA", group: "documents", defaultChecked: false },
  {
    value: "gmp_certificate",
    label: "GMP certificate",
    group: "documents",
    defaultChecked: false,
  },
  { value: "msds", label: "MSDS", group: "documents", defaultChecked: false },
  { value: "dmf", label: "DMF / CEP", group: "documents", defaultChecked: false },
  {
    value: "spec_sheet",
    label: "Spec sheet",
    group: "documents",
    defaultChecked: false,
  },
];

const QUANTITY_UNITS = ["kg", "MT", "g", "L", "pcs", "drums", "boxes"];

const DEFAULT_ASKS = CHECKLIST.filter((ask) => ask.defaultChecked).map((ask) => ask.value);

/**
 * Multi-product supplier enquiry dialog.
 * 
 * This is the redesigned modal that allows contacting one supplier about
 * multiple products from different tenders in a single email.
 * 
 * Architecture:
 * - One supplier = one inquiry (one email)
 * - One inquiry can contain products from multiple tenders
 * - Internally, each product creates its own sourcing_request with its tender_id
 * - The email is numbered with each product's tender reference
 * 
 * Workflow:
 * 1. User clicks "Send Enquiry" from a tender product-supplier match
 * 2. That product is automatically included in "Products to inquire"
 * 3. Backend discovers other products this supplier can supply
 * 4. User can select additional products to include in the same email
 * 5. User configures quantity per product, plus shared requirements
 * 6. One email is sent, but N sourcing requests are created (one per product)
 */
export function MultiProductEnquiryDialog({
  open,
  onClose,
  companyId,
  companyName,
  companyCountry,
  initialProduct,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  /** The supplier being contacted */
  companyId: number;
  companyName: string;
  companyCountry: string | null;
  /** The product that triggered the dialog - automatically included */
  initialProduct: EnquiryProduct;
  /** Callback after successful submission */
  onCreated: () => void;
}) {
  const { data: settings } = useMailboxSettings();
  const composeInquiry = useComposeInquiry();
  const fetchDraft = useGroupedInquiryDraft();
  const sendInquiry = useSendGroupedInquiry();

  // The tender line has no contact of its own; the dropdown starts on "use the
  // company address" and the buyer picks a person if he wants one.
  const [selectedContactId, setSelectedContactId] = useState<number | "">("");

  // Products selected for this inquiry
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([
    {
      product: initialProduct,
      quantity: initialProduct.defaultQuantity || "",
      quantityUnit: initialProduct.defaultQuantityUnit || "kg",
    },
  ]);

  // What to ask for (applies to all products in this inquiry)
  const [asks, setAsks] = useState<Set<string>>(
    () => new Set(DEFAULT_ASKS)
  );

  // Additional notes for the supplier
  const [notes, setNotes] = useState("");

  // Email preview state. The draft itself comes from the server — see
  // `previewInput` below — and this holds only what the buyer typed over it.
  const [previewOverrides, setPreviewOverrides] = useState<{
    to?: string;
    subject?: string;
    body?: string;
  }>({});

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);

  const debouncedNotes = useDebounced(notes, 400);

  // Fetch contacts for this supplier
  const { data: contactsData } = useContacts({ company_id: companyId, size: 50 });
  const contacts = useMemo(() => contactsData?.items ?? [], [contactsData]);

  // What this supplier is shortlisted for elsewhere. Asked for with the
  // products already in the dialog excluded, so the prompt never offers the
  // same one twice — including the one the buyer started from.
  const selectedProductIds = selectedProducts.map((sp) => sp.product.productId);
  const { data: matches, isLoading: matchesLoading } = useSupplierTenderMatches(
    companyId,
    selectedProductIds,
    open,
  );

  // `askKey` stands in for the Set, which is a new object on every tick and
  // would refetch the preview on every render.
  const askKey = useMemo(() => Array.from(asks).sort().join(","), [asks]);
  const itemsKey = JSON.stringify(
    selectedProducts.map((sp) => [
      sp.product.productId,
      sp.product.tenderId,
      sp.quantity.trim(),
      sp.quantityUnit,
    ]),
  );

  const previewInput = useMemo<InquiryComposePreviewInput | null>(() => {
    if (!selectedProducts.length) return null;
    return {
      company_id: companyId,
      contact_person_id: selectedContactId || null,
      items: selectedProducts.map(toComposeItem),
      required_documents: askKey ? askKey.split(",") : [],
      notes: debouncedNotes.trim() || null,
    };
    // `itemsKey` stands in for `selectedProducts`, whose objects are new on
    // every quantity keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, selectedContactId, itemsKey, askKey, debouncedNotes]);

  const preview = useInquiryComposePreview(previewInput, open);
  const previewDraft = preview.data
    ? {
        to: preview.data.to.join(", "),
        subject: preview.data.subject,
        body: preview.data.body,
      }
    : null;
  const previewLoading = preview.isPending || preview.isFetching;

  // Close on Escape, prevent body scroll
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  function toggleAsk(value: string) {
    setAsks((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function addProduct(product: EnquiryProduct) {
    setSelectedProducts((current) => [
      ...current,
      {
        product,
        quantity: product.defaultQuantity || "",
        quantityUnit: product.defaultQuantityUnit || "kg",
      },
    ]);
  }

  function removeProduct(key: string) {
    setSelectedProducts((current) => current.filter((sp) => sp.product.key !== key));
  }

  function updateProductQuantity(key: string, quantity: string) {
    setSelectedProducts((current) =>
      current.map((sp) =>
        sp.product.key === key ? { ...sp, quantity } : sp
      )
    );
  }

  function updateProductUnit(key: string, unit: string) {
    setSelectedProducts((current) =>
      current.map((sp) =>
        sp.product.key === key ? { ...sp, quantityUnit: unit } : sp
      )
    );
  }

  function resetPreview() {
    setPreviewOverrides({});
  }

  /**
   * File the inquiry, then mail it.
   *
   * Two calls rather than one, and in this order on purpose: compose writes
   * the requests and the conversation, so a send that fails leaves a filed
   * draft behind rather than nothing. That is the right remainder — the
   * enquiry is on the board and can be mailed again from Sourcing.
   */
  async function submit(action: "draft" | "send") {
    setError(null);
    setSubmitting(action);

    try {
      const inquiry = await composeInquiry.mutateAsync({
        company_id: companyId,
        contact_person_id: selectedContactId || null,
        items: selectedProducts.map(toComposeItem),
        required_documents: Array.from(asks),
        notes: notes.trim() || null,
      });

      const count = selectedProducts.length;
      const plural = count === 1 ? "" : "s";

      if (action === "draft") {
        toast.success(
          `Drafted ${inquiry.reference ?? "an enquiry"} to ${companyName} — ${count} product${plural}`,
          { duration: 6000 },
        );
        onCreated();
        return;
      }

      // What actually goes out: the buyer's edits where he made them, and
      // otherwise the filed inquiry's own draft rather than the preview —
      // same renderer, but read back from what was written.
      const filed = await fetchDraft.mutateAsync(inquiry.id);
      const to = splitRecipients(previewOverrides.to ?? filed.to.join(", "));
      if (!to.length) {
        throw new Error(
          `No email address for ${companyName} — it stayed a draft.`,
        );
      }

      await sendInquiry.mutateAsync({
        inquiryId: inquiry.id,
        payload: {
          to,
          subject: (previewOverrides.subject ?? filed.subject).trim(),
          body: previewOverrides.body ?? filed.body,
          thread_id: filed.thread_id,
        },
      });

      toast.success(
        `Enquiry sent to ${companyName} — ${count} product${plural} in one email`,
        { duration: 6000 },
      );
      onCreated();
    } catch (err) {
      setError(describeFailure(err, action));
    } finally {
      setSubmitting(null);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const busy = submitting !== null;
  const canSend = settings?.can_send ?? false;
  const hasEdits = Object.keys(previewOverrides).length > 0;

  // Grouped by tender for display only — the API answers with flat rows,
  // because the grouping is a presentation choice and a supplier can match the
  // same product on two bids.
  const additionalByTender = groupByTender(matches ?? []);
  const totalAdditional = matches?.length ?? 0;

  const selectedKeys = new Set(selectedProducts.map((sp) => sp.product.key));

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-md"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-dialog-title"
        className="relative flex h-[94vh] w-[92vw] max-w-[1800px] flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-2xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="enquiry-dialog-title" className="text-base font-bold text-foreground">
              Create Supplier Enquiry
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {companyName}
              {companyCountry && ` · ${companyCountry}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left panel - Configuration */}
          <div className="min-h-0 shrink-0 space-y-5 overflow-y-auto border-b border-border px-6 py-5 lg:w-[480px] lg:border-b-0 lg:border-r">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            {/* Contact selection */}
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Contact person
              </p>
              <Select
                value={selectedContactId}
                onChange={(event) =>
                  setSelectedContactId(event.target.value ? Number(event.target.value) : "")
                }
                aria-label={`Contact at ${companyName}`}
                className="h-9 text-xs"
              >
                <option value="">No contact — use company address</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name_en}
                    {contact.is_primary ? " (Primary)" : ""}
                  </option>
                ))}
              </Select>
            </section>

            {/* Products to inquire */}
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Products to inquire
              </p>
              <div className="space-y-3">
                {selectedProducts.map((sp) => (
                  <div
                    key={sp.product.key}
                    className="space-y-2 rounded-xl border border-border/60 bg-secondary/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">
                          {sp.product.productName}
                        </p>
                        {sp.product.casNumber && (
                          <p className="text-xs text-muted-foreground">
                            CAS: {sp.product.casNumber}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Tender: {sp.product.tenderReference}
                        </p>
                      </div>
                      {selectedProducts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(sp.product.key)}
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="Remove product"
                        >
                          <Trash2 className="size-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={sp.quantity}
                        onChange={(event) =>
                          updateProductQuantity(sp.product.key, event.target.value)
                        }
                        inputMode="decimal"
                        placeholder="500"
                        aria-label="Quantity"
                        className="h-8 flex-1 text-sm"
                      />
                      <Select
                        value={sp.quantityUnit}
                        onChange={(event) =>
                          updateProductUnit(sp.product.key, event.target.value)
                        }
                        aria-label="Unit"
                        className="h-8 w-24 shrink-0 text-xs"
                      >
                        {QUANTITY_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Additional matches */}
            {matchesLoading && (
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Checking what else this supplier matches…
              </p>
            )}
            {totalAdditional > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  This supplier also matches {totalAdditional} other product
                  {totalAdditional > 1 ? "s" : ""}
                </p>
                <div className="space-y-3">
                  {additionalByTender.map((group) => (
                    <div key={group.tenderId} className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        {group.heading}
                      </p>
                      {group.products.map((product) => {
                        const isSelected = selectedKeys.has(product.key);
                        const isDisabled = product.alreadyRequested;

                        return (
                          <label
                            key={product.key}
                            className={cn(
                              "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                              isDisabled
                                ? "cursor-not-allowed border-border/40 bg-secondary/20 opacity-60"
                                : isSelected
                                  ? "cursor-pointer border-primary/40 bg-primary/5"
                                  : "cursor-pointer border-border/60 bg-card hover:border-border hover:bg-accent"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => {
                                if (isDisabled) return;
                                if (isSelected) {
                                  removeProduct(product.key);
                                } else {
                                  addProduct(product);
                                }
                              }}
                              disabled={isDisabled}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-foreground">
                                  {product.productName}
                                </p>
                                {product.alreadyRequested && (
                                  <span className="shrink-0 text-xs font-bold text-warning-foreground">
                                    ⚠ Already requested
                                  </span>
                                )}
                              </div>
                              {product.casNumber && (
                                <p className="text-xs text-muted-foreground">
                                  CAS: {product.casNumber}
                                </p>
                              )}
                              {product.alreadyRequested && product.existingRequestId && (
                                <Link
                                  href={`/sourcing?open=${product.existingRequestId}`}
                                  className="mt-1 inline-block text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View existing inquiry
                                </Link>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements checklist */}
            <section className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Ask supplier to confirm
              </p>
              <AskGrid
                group="terms"
                asks={asks}
                onToggle={toggleAsk}
                columns="grid-cols-2"
              />
              <p className="pt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Documents to attach
              </p>
              <AskGrid
                group="documents"
                asks={asks}
                onToggle={toggleAsk}
                columns="grid-cols-2"
              />
            </section>

            {/* Notes */}
            <section className="space-y-1.5">
              <label
                htmlFor="enquiry-notes"
                className="text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                Notes to supplier (optional)
              </label>
              <textarea
                id="enquiry-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Any specific requirements for this supplier"
                className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </section>
          </div>

          {/* Right panel - Email preview */}
          <div className="flex min-h-0 flex-1 flex-col bg-secondary/25">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-6 py-3">
              <Mail className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
              <p className="text-xs font-bold text-foreground">Email preview</p>
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-muted-foreground">
                {settings?.account
                  ? `From ${settings.account.email_address}`
                  : "No mailbox connected"}
              </p>
              {hasEdits && (
                <button
                  type="button"
                  onClick={resetPreview}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RotateCcw className="size-3" strokeWidth={2.5} />
                  Reset to template
                </button>
              )}
            </div>

            {previewLoading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Preparing email…
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
                {!canSend && <MailboxNotice settings={settings} />}
                {hasEdits && (
                  <Notice tone="info">
                    You&rsquo;ve edited this message, so changes to the checklist won&rsquo;t
                    update it. Reset to template to regenerate.
                  </Notice>
                )}

                <Field label="To">
                  <Input
                    value={previewOverrides.to ?? previewDraft?.to ?? ""}
                    onChange={(event) =>
                      setPreviewOverrides((prev) => ({ ...prev, to: event.target.value }))
                    }
                    placeholder="sales@supplier.com"
                    autoComplete="off"
                    className="h-9 bg-card text-xs"
                  />
                </Field>

                <Field label="Subject">
                  <Input
                    value={previewOverrides.subject ?? previewDraft?.subject ?? ""}
                    onChange={(event) =>
                      setPreviewOverrides((prev) => ({ ...prev, subject: event.target.value }))
                    }
                    maxLength={500}
                    className="h-9 bg-card text-xs"
                  />
                </Field>

                <label className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Message
                  </span>
                  <textarea
                    value={previewOverrides.body ?? previewDraft?.body ?? ""}
                    onChange={(event) =>
                      setPreviewOverrides((prev) => ({ ...prev, body: event.target.value }))
                    }
                    spellCheck={false}
                    className="min-h-0 flex-1 resize-none rounded-xl border border-input bg-card px-4 py-3 font-mono text-xs leading-relaxed text-foreground shadow-sm outline-none transition-all hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-6 py-4">
          <p className="text-[11px] font-medium text-muted-foreground">
            One email, {selectedProducts.length} separate sourcing request
            {selectedProducts.length > 1 ? "s" : ""} — replies land back on each enquiry.
          </p>
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit("draft")}
              disabled={busy}
            >
              {submitting === "draft" ? <Loader2 className="animate-spin" /> : <FileText />}
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={() => submit("send")}
              disabled={busy || !canSend || previewLoading}
              title={
                canSend ? undefined : "Connect a Gmail account in Settings → Email Config"
              }
            >
              {submitting === "send" ? <Loader2 className="animate-spin" /> : <Send />}
              Send Enquiry
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

/** One selected row as the API's line item. */
function toComposeItem(sp: SelectedProduct): InquiryComposeItem {
  return {
    product_id: sp.product.productId,
    tender_id: sp.product.tenderId,
    supplier_product_id: sp.product.supplierProductId ?? null,
    required_quantity: sp.quantity.trim() || null,
    quantity_unit: sp.quantityUnit.trim() || null,
    required_specification: sp.product.specification ?? null,
    required_packing: sp.product.packing ?? null,
  };
}

/**
 * Flat match rows as tender-headed sections.
 *
 * Keyed by tender id rather than reference, because a bid with no reference
 * number on file is still its own bid and merging two of them under "" would
 * quietly file a product against the wrong one.
 */
function groupByTender(
  matches: SupplierTenderMatch[],
): { tenderId: number; heading: string; products: EnquiryProduct[] }[] {
  const groups = new Map<
    number,
    { tenderId: number; heading: string; products: EnquiryProduct[] }
  >();
  for (const match of matches) {
    let group = groups.get(match.tender_id);
    if (!group) {
      group = {
        tenderId: match.tender_id,
        heading: match.tender_reference ?? match.tender_title,
        products: [],
      };
      groups.set(match.tender_id, group);
    }
    group.products.push({
      key: `${match.product_id}-${match.tender_id}`,
      productId: match.product_id,
      productName: match.product_name,
      casNumber: match.cas_number,
      tenderId: match.tender_id,
      tenderReference: match.tender_reference ?? match.tender_title,
      alreadyRequested: match.already_requested,
      existingRequestId: match.existing_request_id,
      defaultQuantity: match.quantity,
      defaultQuantityUnit: match.quantity_unit,
      supplierProductId: match.supplier_product_id,
    });
  }
  return Array.from(groups.values());
}

/** "a@x.com, b@y.com" as a list, empties dropped. */
function splitRecipients(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((address) => address.trim())
    .filter(Boolean);
}

function describeFailure(reason: unknown, action: "draft" | "send"): string {
  if (isMailboxReauthError(reason)) {
    return "The Gmail connection expired — reconnect it in Settings → Email Config. The enquiry was filed as a draft.";
  }
  if (reason instanceof ApiError) return reason.message;
  if (reason instanceof Error) return reason.message;
  return action === "send"
    ? "Could not send this enquiry. Is the API running?"
    : "Could not draft this enquiry. Is the API running?";
}

function MailboxNotice({ settings }: { settings: MailboxSettings | undefined }) {
  if (!settings) return null;

  if (!settings.configured) {
    return (
      <Notice>
        Gmail isn&rsquo;t configured on the server — <code>GMAIL_CLIENT_ID</code> and{" "}
        <code>GMAIL_CLIENT_SECRET</code> are unset. You can still save this as a draft.
      </Notice>
    );
  }
  if (!settings.account) {
    return (
      <Notice>
        Gmail is configured, but no mailbox has been authorised yet — that is a one-time
        consent at <SettingsLink>Settings → Email Config</SettingsLink>. You can still
        save this as a draft.
      </Notice>
    );
  }
  return (
    <Notice>
      The Gmail grant for {settings.account.email_address} has lapsed — Google expires it
      every 7 days on a Testing-mode app. Reconnect at{" "}
      <SettingsLink>Settings → Email Config</SettingsLink>. You can still save this as a
      draft.
    </Notice>
  );
}

function SettingsLink({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href="/settings?tab=email"
      className="font-bold underline underline-offset-2 hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function AskGrid({
  group,
  asks,
  onToggle,
  columns,
}: {
  group: "terms" | "documents";
  asks: Set<string>;
  onToggle: (value: string) => void;
  columns: string;
}) {
  return (
    <div className={cn("grid gap-2", columns)}>
      {CHECKLIST.filter((ask) => ask.group === group).map((ask) => (
        <label
          key={ask.value}
          className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground"
        >
          <Checkbox checked={asks.has(ask.value)} onChange={() => onToggle(ask.value)} />
          {ask.label}
        </label>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Notice({
  children,
  tone = "warning",
}: {
  children: React.ReactNode;
  tone?: "warning" | "info";
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : undefined}
      className={cn(
        "flex shrink-0 items-start gap-2 rounded-xl border p-2.5 text-[11px] font-medium leading-relaxed",
        tone === "warning"
          ? "border-warning/30 bg-warning/10 text-warning-foreground"
          : "border-border/60 bg-card text-muted-foreground"
      )}
    >
      <AlertTriangle className="mt-px size-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
