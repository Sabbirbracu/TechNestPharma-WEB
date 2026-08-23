"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useContacts, useCreateSourcingRequest } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { TenderItem } from "@/types/api";

/** A shortlist row that's actually eligible for an enquiry — must have a real
 *  supplier attached. Callers narrow to this before opening the dialog. */
export type EnquiryTarget = TenderItem & { company_id: number };

const DOCUMENT_CHECKLIST: { value: string; label: string; defaultChecked: boolean }[] = [
  { value: "price", label: "Price", defaultChecked: true },
  { value: "moq", label: "MOQ", defaultChecked: true },
  { value: "lead_time", label: "Lead time", defaultChecked: true },
  { value: "payment_terms", label: "Payment terms", defaultChecked: true },
  { value: "coa", label: "COA", defaultChecked: false },
  { value: "gmp_certificate", label: "GMP certificate", defaultChecked: false },
];

const DEFAULT_DOCUMENTS = new Set(
  DOCUMENT_CHECKLIST.filter((doc) => doc.defaultChecked).map((doc) => doc.value),
);

/**
 * One or several enquiries for the same product, opened either from a single
 * supplier row's "Start Enquiry" button or from the group's bulk bar — same
 * dialog either way, since the only real difference is how many supplier
 * cards it lists (FR-SRC, per the tender→product→supplier→enquiry model).
 *
 * Deliberately does not pretend to send anything: there is no Gmail
 * integration yet, so this only ever files a draft `SourcingRequest` per
 * supplier. The requested-information checklist maps straight onto
 * `required_documents` — a real field, not new schema.
 */
export function StartEnquiryDialog({
  open,
  onClose,
  tenderId,
  productId,
  productName,
  targets,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tenderId: number;
  productId: number;
  productName: string;
  targets: EnquiryTarget[];
  onCreated: () => void;
}) {
  const createSourcing = useCreateSourcingRequest();
  const [contactByCompany, setContactByCompany] = useState<Record<number, number | "">>({});
  const [documents, setDocuments] = useState<Set<string>>(new Set(DEFAULT_DOCUMENTS));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function toggleDocument(value: string) {
    setDocuments((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const requiredDocuments = Array.from(documents);

    const results = await Promise.allSettled(
      targets.map((item) =>
        createSourcing.mutateAsync({
          product_id: productId,
          company_id: item.company_id,
          tender_id: tenderId,
          supplier_product_id: item.supplier_product_id,
          contact_person_id: contactByCompany[item.company_id] || null,
          required_quantity: item.quantity,
          quantity_unit: item.quantity_unit,
          required_specification: item.specification,
          required_documents: requiredDocuments.length > 0 ? requiredDocuments : null,
          notes: notes.trim() || null,
        }),
      ),
    );
    setSubmitting(false);

    const failed = results.filter((result) => result.status === "rejected").length;
    const succeeded = results.length - failed;

    if (succeeded === 0) {
      setError(
        results[0].status === "rejected" && results[0].reason instanceof ApiError
          ? results[0].reason.message
          : "Could not start this enquiry. Is the API running?",
      );
      return;
    }
    if (failed === 0) {
      toast.success(
        `Started ${succeeded === 1 ? "a sourcing enquiry" : `${succeeded} sourcing enquiries`} for "${productName}"`,
        { duration: 6000 },
      );
    } else {
      toast.error(`Started ${succeeded} of ${results.length} enquiries — ${failed} failed`, {
        duration: 6000,
      });
    }
    onCreated();
  }

  if (!open || typeof document === "undefined") return null;

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
        aria-labelledby="start-enquiry-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card text-card-foreground shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="start-enquiry-title" className="text-base font-bold text-foreground">
              Start Sourcing Enquiry
            </h2>
            <p className="truncate text-xs text-muted-foreground">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {targets.length === 1 ? "Supplier" : `Suppliers (${targets.length})`}
            </p>
            {targets.map((item) => (
              <SupplierTarget
                key={item.id}
                item={item}
                selectedContactId={contactByCompany[item.company_id] ?? ""}
                onChangeContact={(contactId) =>
                  setContactByCompany((current) => ({ ...current, [item.company_id]: contactId }))
                }
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Requested information
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DOCUMENT_CHECKLIST.map((doc) => (
                <label
                  key={doc.value}
                  className="flex items-center gap-2 text-sm font-medium text-foreground"
                >
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input accent-primary"
                    checked={documents.has(doc.value)}
                    onChange={() => toggleDocument(doc.value)}
                  />
                  {doc.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything specific to ask this supplier"
              className="w-full resize-y rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          {/* Real sending is the Gmail slice, not built yet — honest about
              what this button actually does, same as Sourcing's own
              disabled "Send Follow-up". */}
          <p className="rounded-lg bg-secondary/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            This files a draft sourcing enquiry — sending the email itself isn&rsquo;t automated yet.
          </p>

          <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {targets.length === 1 ? "Create Enquiry" : `Create ${targets.length} Enquiries`}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SupplierTarget({
  item,
  selectedContactId,
  onChangeContact,
}: {
  item: EnquiryTarget;
  selectedContactId: number | "";
  onChangeContact: (contactId: number | "") => void;
}) {
  const { data } = useContacts({ company_id: item.company_id, size: 50 });
  const contacts = data?.items ?? [];

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{item.company_name}</p>
        {item.country && (
          <p className="text-[11px] font-medium text-muted-foreground">{item.country}</p>
        )}
      </div>
      <div className="w-44 shrink-0">
        <Select
          value={selectedContactId}
          onChange={(event) =>
            onChangeContact(event.target.value ? Number(event.target.value) : "")
          }
          aria-label={`Contact at ${item.company_name}`}
          className="h-9 text-xs"
        >
          <option value="">No contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name_en}
              {contact.is_primary ? " (Primary)" : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
