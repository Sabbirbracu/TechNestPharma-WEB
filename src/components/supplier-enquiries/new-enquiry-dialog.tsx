"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Building2,
  Check,
  FileText,
  LayoutTemplate,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  isMailboxReauthError,
  useCompanies,
  useComposeInquiry,
  useContacts,
  useEmailTemplates,
  useGroupedInquiryDraft,
  useInquiryComposePreview,
  useInquirySuggestions,
  useMailboxSettings,
  useOffers,
  useSendGroupedInquiry,
  useSupplierTenderMatches,
} from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import type {
  Inquiry,
  InquiryComposeItem,
  InquiryComposePreviewInput,
  SupplierTenderMatch,
} from "@/types/api";

/**
 * New Enquiry / Add Product (2026-09-17).
 *
 * One supplier, one or more products, ONE enquiry and one email. Each product
 * keeps its own source — direct sourcing, or the tender it is for — so a reply
 * still maps back to the right bid. Before a new enquiry is opened, the
 * supplier's active enquiries are offered first: adding to one keeps the
 * supplier in a single conversation.
 */

type Supplier = { id: number; name: string; country: string | null };

type Chosen = {
  key: string;
  productId: number;
  productName: string;
  casNumber: string | null;
  supplierProductId: number | null;
  /** "direct" or a tender id as a string, so it can sit in a <select>. */
  source: string;
  quantity: string;
  unit: string;
};

const UNITS = ["kg", "MT", "g", "L", "pcs", "drums", "boxes"];

const ASKS: { value: string; label: string; on: boolean }[] = [
  { value: "price", label: "Price", on: true },
  { value: "moq", label: "MOQ", on: true },
  { value: "packing", label: "Packing", on: true },
  { value: "lead_time", label: "Lead time", on: true },
  { value: "incoterm", label: "Incoterm & port", on: true },
  { value: "payment_terms", label: "Payment terms", on: true },
  { value: "validity", label: "Price validity", on: true },
  { value: "sample", label: "Sample", on: false },
  { value: "coa", label: "COA", on: false },
  { value: "msds", label: "MSDS", on: false },
  { value: "dmf", label: "DMF / CEP", on: false },
  { value: "spec_sheet", label: "Spec sheet", on: false },
];

export function NewEnquiryDialog({
  onClose,
  onCreated,
  supplier: presetSupplier,
  inquiryId: presetInquiryId,
}: {
  onClose: () => void;
  onCreated: (inquiryId: number) => void;
  /** Add Product mode: the supplier is fixed… */
  supplier?: Supplier;
  /** …and so is the enquiry the products go into. */
  inquiryId?: number;
}) {
  const [supplier, setSupplier] = useState<Supplier | null>(presetSupplier ?? null);
  const [chosen, setChosen] = useState<Chosen[]>([]);
  // `undefined` = not decided yet (defaults to the first open enquiry),
  // `null` = "create a new enquiry".
  const [target, setTarget] = useState<number | null | undefined>(presetInquiryId);
  const [contactId, setContactId] = useState<number | "">("");
  const [asks, setAsks] = useState<Set<string>>(
    () => new Set(ASKS.filter((a) => a.on).map((a) => a.value)),
  );
  const [notes, setNotes] = useState("");
  const [overrides, setOverrides] = useState<{ to?: string; subject?: string; body?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);

  const companyId = supplier?.id ?? null;
  const { data: settings } = useMailboxSettings();
  const suggestions = useInquirySuggestions(companyId);
  const openEnquiries = useMemo(
    () => suggestions.data?.open_inquiries ?? [],
    [suggestions.data],
  );
  const alreadyAsked = suggestions.data?.already_asked ?? {};
  const effectiveTarget =
    target === undefined ? (openEnquiries[0]?.id ?? null) : target;
  const targetEnquiry = openEnquiries.find((e) => e.id === effectiveTarget) ?? null;

  const { data: contactsPage } = useContacts({ company_id: companyId ?? 0, size: 50 });
  const contacts = companyId ? (contactsPage?.items ?? []) : [];

  const compose = useComposeInquiry();
  const fetchDraft = useGroupedInquiryDraft();
  const send = useSendGroupedInquiry();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, busy]);

  const items: InquiryComposeItem[] = chosen.map((c) => ({
    product_id: c.productId,
    tender_id: c.source === "direct" ? null : Number(c.source),
    supplier_product_id: c.supplierProductId,
    required_quantity: c.quantity.trim() || null,
    quantity_unit: c.unit || null,
  }));
  const debouncedNotes = useDebounced(notes, 400);
  const itemsKey = JSON.stringify(items);
  const askKey = [...asks].sort().join(",");
  // The email template: the saved default until the buyer picks another
  // (`undefined` = not picked yet; `null` = the built-in email).
  const templates = useEmailTemplates("enquiry");
  const [pickedTemplate, setPickedTemplate] = useState<number | null | undefined>(undefined);
  const templateId =
    pickedTemplate !== undefined
      ? pickedTemplate
      : (templates.data?.find((t) => t.is_default)?.id ?? null);
  const previewInput = useMemo<InquiryComposePreviewInput | null>(
    () =>
      companyId && chosen.length && !templates.isPending
        ? {
            company_id: companyId,
            contact_person_id: contactId || null,
            items: JSON.parse(itemsKey) as InquiryComposeItem[],
            required_documents: askKey ? askKey.split(",") : [],
            notes: debouncedNotes.trim() || null,
            template_id: templateId,
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, contactId, itemsKey, askKey, debouncedNotes, templateId, templates.isPending],
  );
  const preview = useInquiryComposePreview(previewInput, true);

  function reset(next: Supplier | null) {
    setSupplier(next);
    setChosen([]);
    setTarget(undefined);
    setContactId("");
    setOverrides({});
    setError(null);
  }

  function add(product: Omit<Chosen, "key" | "quantity" | "unit" | "source"> & {
    source?: string;
    quantity?: string | null;
    unit?: string | null;
  }) {
    setChosen((current) =>
      current.some((c) => c.productId === product.productId)
        ? current
        : [
            ...current,
            {
              ...product,
              key: `${product.productId}`,
              source: product.source ?? "direct",
              quantity: product.quantity ?? "",
              unit: product.unit ?? "kg",
            },
          ],
    );
  }

  function patch(key: string, change: Partial<Chosen>) {
    setChosen((current) => current.map((c) => (c.key === key ? { ...c, ...change } : c)));
  }

  async function submit(action: "draft" | "send") {
    if (!supplier || !chosen.length) return;
    setError(null);
    setBusy(action);
    try {
      const inquiry: Inquiry = await compose.mutateAsync({
        company_id: supplier.id,
        inquiry_id: effectiveTarget,
        contact_person_id: contactId || null,
        items,
        required_documents: [...asks],
        notes: notes.trim() || null,
      });
      const count = chosen.length;
      const products = `${count} product${count === 1 ? "" : "s"}`;

      if (action === "draft") {
        toast.success(
          effectiveTarget
            ? `Added ${products} to ${inquiry.reference} as draft`
            : `Drafted ${inquiry.reference} to ${supplier.name} — ${products}`,
        );
        onCreated(inquiry.id);
        return;
      }

      // Adding to an enquiry that has already been emailed: the email asks
      // about the new products only, in the existing conversation. An enquiry
      // never sent yet (new, or an old draft) sends its whole draft — the
      // send moves every draft line to Sent, so every one must be in it.
      const rendered =
        effectiveTarget && inquiry.sent_at && preview.data
          ? { ...preview.data, thread_id: inquiry.external_thread_id }
          : await fetchDraft.mutateAsync({ inquiryId: inquiry.id, templateId });
      const to = splitRecipients(overrides.to ?? rendered.to.join(", "));
      if (!to.length) {
        throw new Error(`No email address on file for ${supplier.name} — saved as a draft.`);
      }
      await send.mutateAsync({
        inquiryId: inquiry.id,
        payload: {
          to,
          subject: (overrides.subject ?? rendered.subject).trim(),
          body: overrides.body ?? rendered.body,
          thread_id: rendered.thread_id ?? null,
        },
      });
      toast.success(`Enquiry sent to ${supplier.name} — ${products} in one email`);
      onCreated(inquiry.id);
    } catch (reason) {
      setError(describe(reason));
    } finally {
      setBusy(null);
    }
  }

  if (typeof document === "undefined") return null;
  const canSend = settings?.can_send ?? false;
  const addMode = presetInquiryId !== undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-enquiry-title"
        className="flex h-full max-h-[94vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="new-enquiry-title" className="text-base font-bold text-foreground">
              {addMode ? "Add Products to Enquiry" : "New Supplier Enquiry"}
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              One supplier · one email · any number of products
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Left: who and what */}
          <div className="min-h-0 space-y-6 overflow-y-auto border-b border-border px-5 py-5 lg:w-[55%] lg:border-b-0 lg:border-r">
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <Step number={1} title="Supplier">
              {supplier ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                  <Building2 className="size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{supplier.name}</p>
                    {supplier.country && (
                      <p className="text-xs font-medium text-muted-foreground">{supplier.country}</p>
                    )}
                  </div>
                  {!presetSupplier && (
                    <Button variant="ghost" size="sm" onClick={() => reset(null)}>
                      Change
                    </Button>
                  )}
                </div>
              ) : (
                <SupplierPicker onPick={(picked) => reset(picked)} />
              )}
            </Step>

            {supplier && !addMode && openEnquiries.length > 0 && (
              <div className="space-y-2 rounded-xl border border-tile-amber/30 bg-tile-amber-bg/60 p-3.5">
                <p className="text-sm font-bold text-foreground">
                  {supplier.name} already has {openEnquiries.length === 1 ? "an active enquiry" : `${openEnquiries.length} active enquiries`}.
                </p>
                <div className="space-y-1.5">
                  {openEnquiries.map((enquiry) => (
                    <label key={enquiry.id} className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <input
                        type="radio"
                        name="enquiry-target"
                        checked={effectiveTarget === enquiry.id}
                        onChange={() => setTarget(enquiry.id)}
                        className="mt-1 accent-[var(--color-primary)]"
                      />
                      <span>
                        <span className="font-semibold">Add to existing enquiry {enquiry.reference}</span>
                        <span className="block text-xs font-medium text-muted-foreground">
                          {enquiry.lines.slice(0, 3).map((l) => l.product_name).join(", ")}
                          {enquiry.lines.length > 3 && ` +${enquiry.lines.length - 3} more`}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="radio"
                      name="enquiry-target"
                      checked={effectiveTarget === null}
                      onChange={() => setTarget(null)}
                      className="accent-[var(--color-primary)]"
                    />
                    <span className="font-semibold">Create a separate enquiry</span>
                  </label>
                </div>
              </div>
            )}

            {supplier && (
              <Step number={2} title="Products">
                <ProductPicker
                  companyId={supplier.id}
                  chosenIds={new Set(chosen.map((c) => c.productId))}
                  alreadyAsked={alreadyAsked}
                  openEnquiries={openEnquiries.map((e) => ({ id: e.id, reference: e.reference }))}
                  onAdd={add}
                />
              </Step>
            )}

            {chosen.length > 0 && (
              <Step number={3} title={`Quantities & source (${chosen.length})`}>
                <SelectedProducts
                  companyId={supplier!.id}
                  chosen={chosen}
                  onPatch={patch}
                  onRemove={(key) => setChosen((c) => c.filter((x) => x.key !== key))}
                />
              </Step>
            )}

            {supplier && (
              <Step number={4} title="Details">
                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Contact person</span>
                    <Select
                      id="enquiry-contact"
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value ? Number(e.target.value) : "")}
                      className="h-9 text-sm"
                    >
                      <option value="">No contact — use the company address</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name_en}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Ask the supplier for</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ASKS.map((ask) => {
                        const on = asks.has(ask.value);
                        return (
                          <button
                            key={ask.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setAsks((current) => {
                                const next = new Set(current);
                                if (on) next.delete(ask.value);
                                else next.add(ask.value);
                                return next;
                              })
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors",
                              on
                                ? "bg-primary/10 text-primary ring-primary/30"
                                : "bg-card text-muted-foreground ring-border hover:text-foreground",
                            )}
                          >
                            {on && <Check className="size-3" />}
                            {ask.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Note to the supplier (optional)</span>
                    <textarea
                      id="enquiry-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                  </label>
                </div>
              </Step>
            )}
          </div>

          {/* Right: the email */}
          <div className="flex min-h-0 flex-1 flex-col bg-secondary/20">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Mail className="size-4 text-primary" />
                Email preview
                {targetEnquiry && (
                  <span className="text-xs font-medium text-muted-foreground">
                    · continues {targetEnquiry.reference}
                  </span>
                )}
              </p>
              {previewInput && (
                <label className="ml-auto flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <LayoutTemplate className="size-3.5 shrink-0" />
                  <span className="sr-only sm:not-sr-only">Template</span>
                  <select
                    aria-label="Email template"
                    value={templateId === null ? "builtin" : String(templateId)}
                    onChange={(e) => {
                      if (
                        Object.keys(overrides).some((k) => k !== "to") &&
                        !window.confirm("Replace the message you have edited with this template?")
                      ) {
                        return;
                      }
                      setOverrides((o) => (o.to ? { to: o.to } : {}));
                      setPickedTemplate(e.target.value === "builtin" ? null : Number(e.target.value));
                    }}
                    className="h-8 min-w-0 max-w-[14rem] rounded-lg border border-input bg-card px-2 text-xs font-medium text-foreground"
                  >
                    <option value="builtin">Standard (built-in)</option>
                    {(templates.data ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {Object.keys(overrides).length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setOverrides({})}>
                  <RotateCcw className="size-3.5" />
                  Reset edits
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!previewInput ? (
                <p className="py-16 text-center text-sm font-medium text-muted-foreground">
                  Pick a supplier and at least one product to see the email.
                </p>
              ) : preview.isPending ? (
                <p className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Writing the email…
                </p>
              ) : preview.data ? (
                <>
                  <Field label="To">
                    <Input
                      id="enquiry-to"
                      value={overrides.to ?? preview.data.to.join(", ")}
                      onChange={(e) => setOverrides((o) => ({ ...o, to: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </Field>
                  <Field label="Subject">
                    <Input
                      id="enquiry-subject"
                      value={overrides.subject ?? preview.data.subject}
                      onChange={(e) => setOverrides((o) => ({ ...o, subject: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </Field>
                  <Field label="Message">
                    <textarea
                      id="enquiry-body"
                      value={overrides.body ?? preview.data.body}
                      onChange={(e) => setOverrides((o) => ({ ...o, body: e.target.value }))}
                      className="min-h-[22rem] w-full rounded-xl border-2 border-input bg-card px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none focus:border-primary/50"
                    />
                  </Field>
                </>
              ) : (
                <p className="py-16 text-center text-sm font-medium text-destructive">
                  The preview could not be written. You can still save a draft.
                </p>
              )}
            </div>
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
              {!canSend && (
                <p className="mr-auto text-xs font-medium text-muted-foreground">
                  Gmail is not connected — you can save a draft.
                </p>
              )}
              <Button variant="ghost" onClick={onClose} disabled={busy !== null}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => submit("draft")}
                disabled={busy !== null || !supplier || !chosen.length}
              >
                {busy === "draft" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                Save Draft
              </Button>
              <Button
                onClick={() => submit("send")}
                disabled={busy !== null || !supplier || !chosen.length || !canSend || !preview.data}
              >
                {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send
              </Button>
            </footer>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SupplierPicker({ onPick }: { onPick: (supplier: Supplier) => void }) {
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 250);
  const { data, isFetching } = useCompanies({ q: q || undefined, size: 8 });
  const companies = data?.items ?? [];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="enquiry-supplier-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search suppliers by name…"
          className="h-10 pl-9"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
        {companies.map((company) => (
          <li key={company.id}>
            <button
              type="button"
              onClick={() =>
                onPick({
                  id: company.id,
                  name: company.name_en,
                  country: company.country?.name ?? null,
                })
              }
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/50"
            >
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{company.name_en}</span>
                {company.country && (
                  <span className="block text-xs text-muted-foreground">{company.country.name}</span>
                )}
              </span>
            </button>
          </li>
        ))}
        {!isFetching && companies.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">No suppliers match.</li>
        )}
      </ul>
    </div>
  );
}

function ProductPicker({
  companyId,
  chosenIds,
  alreadyAsked,
  openEnquiries,
  onAdd,
}: {
  companyId: number;
  chosenIds: Set<number>;
  alreadyAsked: Record<string, number>;
  openEnquiries: { id: number; reference: string | null }[];
  onAdd: (product: {
    productId: number;
    productName: string;
    casNumber: string | null;
    supplierProductId: number | null;
    source?: string;
    quantity?: string | null;
    unit?: string | null;
  }) => void;
}) {
  const [filter, setFilter] = useState("");
  const matches = useSupplierTenderMatches(companyId, []);
  const offers = useOffers({ company_id: companyId, size: 100 });
  const needle = filter.trim().toLowerCase();
  const refOf = (inquiryId: number) =>
    openEnquiries.find((e) => e.id === inquiryId)?.reference ?? "an open enquiry";

  const tenderRows = (matches.data ?? []).filter(
    (m) => !needle || m.product_name.toLowerCase().includes(needle),
  );
  const catalogue = (offers.data?.items ?? []).filter(
    (o) =>
      o.product &&
      (!needle ||
        o.product.name_en.toLowerCase().includes(needle) ||
        (o.product.cas_number ?? "").includes(needle)),
  );

  function status(productId: number) {
    const asked = alreadyAsked[String(productId)];
    if (chosenIds.has(productId)) return { disabled: true, note: "Added" };
    if (asked) return { disabled: true, note: `Already in ${refOf(asked)}` };
    return { disabled: false, note: null };
  }

  return (
    <div className="space-y-3">
      <Input
        id="enquiry-product-filter"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter this supplier's products…"
        className="h-9 text-sm"
      />

      <ProductGroup
        title="On live tenders"
        hint="Shortlisted for this supplier — added with that tender as the source."
        loading={matches.isPending}
        empty="This supplier is not shortlisted on any live tender."
      >
        {tenderRows.map((match: SupplierTenderMatch) => {
          const s = status(match.product_id);
          return (
            <PickRow
              key={`t-${match.shortlist_id}`}
              name={match.product_name}
              sub={`Tender ${match.tender_reference ?? match.tender_title}`}
              note={s.note}
              disabled={s.disabled}
              onAdd={() =>
                onAdd({
                  productId: match.product_id,
                  productName: match.product_name,
                  casNumber: match.cas_number,
                  supplierProductId: match.supplier_product_id,
                  source: String(match.tender_id),
                  quantity: match.quantity,
                  unit: match.quantity_unit,
                })
              }
            />
          );
        })}
      </ProductGroup>

      <ProductGroup
        title="Supplier catalogue"
        hint="Everything this supplier offers — added as direct sourcing."
        loading={offers.isPending}
        empty="No products on file for this supplier."
      >
        {catalogue.map((offer) => {
          const product = offer.product!;
          const s = status(product.id);
          return (
            <PickRow
              key={`o-${offer.id}`}
              name={product.name_en}
              sub={product.cas_number ? `CAS ${product.cas_number}` : null}
              note={s.note}
              disabled={s.disabled}
              onAdd={() =>
                onAdd({
                  productId: product.id,
                  productName: product.name_en,
                  casNumber: product.cas_number,
                  supplierProductId: offer.id,
                })
              }
            />
          );
        })}
      </ProductGroup>
    </div>
  );
}

function ProductGroup({
  title,
  hint,
  loading,
  empty,
  children,
}: {
  title: string;
  hint: string;
  loading: boolean;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="border-b border-border bg-secondary/30 px-3 py-2">
        <p className="text-xs font-bold text-foreground">{title}</p>
        <p className="text-[11px] font-medium text-muted-foreground">{hint}</p>
      </div>
      <ul className="max-h-60 divide-y divide-border/70 overflow-y-auto">
        {loading ? (
          <li className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading…
          </li>
        ) : children.length ? (
          children
        ) : (
          <li className="px-3 py-3 text-xs text-muted-foreground">{empty}</li>
        )}
      </ul>
    </div>
  );
}

function PickRow({
  name,
  sub,
  note,
  disabled,
  onAdd,
}: {
  name: string;
  sub: string | null;
  note: string | null;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        {sub && <span className="block truncate text-[11px] font-medium text-muted-foreground">{sub}</span>}
      </span>
      {note ? (
        <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{note}</span>
      ) : (
        <Button variant="outline" size="sm" className="h-7 shrink-0 px-2.5" onClick={onAdd} disabled={disabled}>
          <Plus className="size-3.5" />
          Add
        </Button>
      )}
    </li>
  );
}

function SelectedProducts({
  companyId,
  chosen,
  onPatch,
  onRemove,
}: {
  companyId: number;
  chosen: Chosen[];
  onPatch: (key: string, change: Partial<Chosen>) => void;
  onRemove: (key: string) => void;
}) {
  const { data: matches } = useSupplierTenderMatches(companyId, []);

  return (
    <ul className="space-y-2">
      {chosen.map((c) => {
        const tenders = (matches ?? []).filter((m) => m.product_id === c.productId);
        return (
          <li key={c.key} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{c.productName}</p>
                {c.casNumber && <p className="text-[11px] text-muted-foreground">CAS {c.casNumber}</p>}
              </div>
              <button
                type="button"
                onClick={() => onRemove(c.key)}
                aria-label={`Remove ${c.productName}`}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem]">
              <Select
                id={`source-${c.key}`}
                aria-label="Source"
                value={c.source}
                onChange={(e) => onPatch(c.key, { source: e.target.value })}
                className="h-9 text-xs"
              >
                <option value="direct">Direct sourcing</option>
                {tenders.map((t) => (
                  <option key={t.tender_id} value={String(t.tender_id)}>
                    Tender {t.tender_reference ?? t.tender_title}
                  </option>
                ))}
              </Select>
              <Input
                id={`qty-${c.key}`}
                aria-label="Quantity"
                inputMode="decimal"
                placeholder="Quantity"
                value={c.quantity}
                onChange={(e) => onPatch(c.key, { quantity: e.target.value })}
                className="h-9 text-sm"
              />
              <Select
                id={`unit-${c.key}`}
                aria-label="Unit"
                value={c.unit}
                onChange={(e) => onPatch(c.key, { unit: e.target.value })}
                className="h-9 text-xs"
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function splitRecipients(value: string): string[] {
  return value.split(/[,;]/).map((a) => a.trim()).filter(Boolean);
}

function describe(reason: unknown): string {
  if (isMailboxReauthError(reason)) {
    return "The Gmail connection expired — reconnect it in Settings. The enquiry was saved as a draft.";
  }
  if (reason instanceof ApiError || reason instanceof Error) return reason.message;
  return "Something went wrong. Nothing was sent.";
}
