"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CompanyPicker } from "@/components/companies/company-picker";
import { useCreateSample, useOffers } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import type { CompanyListItem } from "@/types/api";
import { SAMPLE_UNITS } from "./sample-taxonomy";

/**
 * Asking a supplier for a sample.
 *
 * Supplier first, then product — not a flat product search. A sample is always
 * "this supplier's version of this material", and the desk thinks in that
 * order: you decide who to ask before you decide what to ask them for. It also
 * makes the second list short and unambiguous, where a global product search
 * returns the same molecule from nine suppliers.
 */
export function SampleCreateDialog({ onClose }: { onClose: () => void }) {
  const [company, setCompany] = useState<CompanyListItem | null>(null);
  const [offerId, setOfferId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<string>("g");
  const [promisedOn, setPromisedOn] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const create = useCreateSample();
  const offers = useOffers({
    company_id: company?.id ?? undefined,
    size: 100,
  });

  const canSubmit = offerId !== "" && !create.isPending;

  async function submit() {
    try {
      await create.mutateAsync({
        supplier_product_id: Number(offerId),
        // Sent as a string: the column is Numeric and the API parses it, so
        // "0.5" survives instead of becoming a float somewhere in between.
        quantity_value: amount.trim() || null,
        quantity_unit: amount.trim() ? unit : null,
        promised_on: promisedOn || null,
        purpose: purpose.trim() || null,
        notes: notes.trim() || null,
      });
      toast.success("Sample requested.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not create that sample request.",
      );
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New sample request"
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/60 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-card/95 px-5 py-4 backdrop-blur">
          <div>
            <h2 className="text-base font-bold text-foreground">
              New sample request
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              It starts as Requested. Record the promised date once the supplier
              gives you one.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-3.5 px-5 py-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Supplier
            </span>
            <CompanyPicker
              value={company}
              onChange={(next) => {
                setCompany(next);
                // The old selection belongs to the old supplier. Clearing it is
                // what stops a sample being filed against the wrong company.
                setOfferId("");
              }}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Product
            </span>
            <Select
              value={offerId}
              disabled={company === null || offers.isPending}
              onChange={(event) => setOfferId(event.target.value)}
            >
              <option value="">
                {company === null
                  ? "Pick a supplier first"
                  : offers.isPending
                    ? "Loading…"
                    : offers.data?.items.length
                      ? "Choose…"
                      : "This supplier has no products on file"}
              </option>
              {(offers.data?.items ?? []).map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.product?.name_en ?? "Unnamed"}
                  {offer.product?.cas_number ? ` — ${offer.product.cas_number}` : ""}
                </option>
              ))}
            </Select>
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Quantity <span className="font-medium opacity-70">(optional)</span>
              </span>
              <Input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="100"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Unit
              </span>
              <Select
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="w-28"
              >
                {SAMPLE_UNITS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Promised for{" "}
              <span className="font-medium opacity-70">(if they have said)</span>
            </span>
            <Input
              type="date"
              value={promisedOn}
              onChange={(event) => setPromisedOn(event.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              What it is for{" "}
              <span className="font-medium opacity-70">(optional)</span>
            </span>
            <Input
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Which customer or enquiry this is against"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Notes <span className="font-medium opacity-70">(optional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Anything the next person should know…"
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium shadow-sm transition-all placeholder:font-normal placeholder:text-muted-foreground/60 hover:border-ring/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border/60 bg-card px-5 py-3.5">
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {create.isPending && <Loader2 className="animate-spin" />}
            Request sample
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
