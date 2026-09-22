"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Loader2, ReceiptText, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { useAddQuotation } from "@/lib/queries";
import type { EnquiryItem } from "@/types/api";

const CURRENCIES = ["USD", "CNY", "EUR", "INR", "BDT"];
const UNITS = ["kg", "MT", "g", "L", "pcs"];
const INCOTERMS = ["", "EXW", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DDP"];

/**
 * Record what a supplier quoted for one product (2026-09-17).
 *
 * The buyer types the figures — quotations are never parsed out of an email
 * automatically (D-mailbox-03): a misread currency becomes a purchasing
 * decision. Saving moves the product line to Quoted.
 */
export function QuotationDialog({
  items,
  initialItemId,
  onClose,
}: {
  items: EnquiryItem[];
  initialItemId: number | null;
  onClose: () => void;
}) {
  const add = useAddQuotation();
  const [itemId, setItemId] = useState<number>(initialItemId ?? items[0]?.id ?? 0);
  const [form, setForm] = useState({
    price_min: "",
    price_max: "",
    currency: "USD",
    price_unit: "kg",
    moq: "",
    moq_unit: "kg",
    lead_time_days: "",
    incoterm: "",
    packing: "",
    valid_until: "",
    quoted_on: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !add.isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, add.isPending]);

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  function save() {
    setError(null);
    if (!form.price_min.trim()) {
      setError("Enter the quoted price.");
      return;
    }
    add.mutate(
      {
        requestId: itemId,
        payload: {
          quoted_on: form.quoted_on || null,
          price_min: form.price_min.trim(),
          price_max: form.price_max.trim() || null,
          currency: form.currency,
          price_unit: form.price_unit,
          moq: form.moq.trim() || null,
          moq_unit: form.moq.trim() ? form.moq_unit : null,
          lead_time_days: form.lead_time_days.trim() ? Number(form.lead_time_days) : null,
          incoterm: form.incoterm || null,
          packing: form.packing.trim() || null,
          valid_until: form.valid_until || null,
          notes: form.notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          const name = items.find((item) => item.id === itemId)?.product_name ?? "Product";
          toast.success(`Quotation recorded for ${name}`);
          onClose();
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "The quotation could not be saved."),
      },
    );
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !add.isPending) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quotation-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <ReceiptText className="size-5 text-primary" />
          <h2 id="quotation-title" className="flex-1 text-base font-bold text-foreground">
            Record quotation
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </p>
          )}

          <Labeled label="Product">
            <Select id="quote-product" value={itemId} onChange={(e) => setItemId(Number(e.target.value))} className="h-10">
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product_name}
                </option>
              ))}
            </Select>
          </Labeled>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Labeled label="Price">
              <Input id="quote-price-min" inputMode="decimal" value={form.price_min} onChange={set("price_min")} placeholder="120" />
            </Labeled>
            <Labeled label="Up to (optional)">
              <Input id="quote-price-max" inputMode="decimal" value={form.price_max} onChange={set("price_max")} />
            </Labeled>
            <Labeled label="Currency">
              <Select id="quote-currency" value={form.currency} onChange={set("currency")} className="h-10">
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Labeled>
            <Labeled label="Per">
              <Select id="quote-price-unit" value={form.price_unit} onChange={set("price_unit")} className="h-10">
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </Labeled>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Labeled label="MOQ">
              <Input id="quote-moq" inputMode="decimal" value={form.moq} onChange={set("moq")} />
            </Labeled>
            <Labeled label="MOQ unit">
              <Select id="quote-moq-unit" value={form.moq_unit} onChange={set("moq_unit")} className="h-10">
                {UNITS.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </Select>
            </Labeled>
            <Labeled label="Lead time (days)">
              <Input id="quote-lead-time" inputMode="numeric" value={form.lead_time_days} onChange={set("lead_time_days")} />
            </Labeled>
            <Labeled label="Incoterm">
              <Select id="quote-incoterm" value={form.incoterm} onChange={set("incoterm")} className="h-10">
                {INCOTERMS.map((term) => (
                  <option key={term} value={term}>
                    {term || "—"}
                  </option>
                ))}
              </Select>
            </Labeled>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Labeled label="Packing">
              <Input id="quote-packing" value={form.packing} onChange={set("packing")} placeholder="25 kg drum" />
            </Labeled>
            <Labeled label="Quoted on">
              <Input id="quote-quoted-on" type="date" value={form.quoted_on} onChange={set("quoted_on")} />
            </Labeled>
            <Labeled label="Valid until">
              <Input id="quote-valid-until" type="date" value={form.valid_until} onChange={set("valid_until")} />
            </Labeled>
          </div>

          <Labeled label="Notes">
            <textarea
              id="quote-notes"
              value={form.notes}
              onChange={set("notes")}
              rows={2}
              className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </Labeled>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={add.isPending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={add.isPending || !itemId}>
            {add.isPending && <Loader2 className="size-4 animate-spin" />}
            Save quotation
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
