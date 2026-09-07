"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AlertCircle, Loader2, Package, Pencil, X } from "lucide-react";
import { useOffer } from "@/lib/queries";
import { CATEGORY_FILTER_OPTIONS } from "@/components/products/product-taxonomy";
import { cn } from "@/lib/utils";
import {
  GREEN_BUTTON,
  OUTLINE_BUTTON,
} from "@/components/companies/detail/section-card";
import type { OfferListItem } from "@/types/api";

/**
 * "View" on a catalogue row.
 *
 * The row shows what fits in a table; this shows the record. It refetches the
 * offer rather than rendering the row it was opened from, because the list
 * shape deliberately leaves out compendia, incoterm, polymorph and remarks —
 * which are most of the reason someone opens one line in the first place.
 */
export function OfferDetailsDialog({
  offer,
  open,
  onClose,
  onEdit,
}: {
  offer: OfferListItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { data, isPending, error } = useOffer(open ? (offer?.id ?? null) : null);
  const record = data ?? offer;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const price = priceLine(record);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="offer-details-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="max-h-[85vh] overflow-y-auto rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-card/95 px-6 py-4 backdrop-blur">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
            <Package className="size-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="offer-details-title"
              className="truncate text-base font-bold text-foreground"
            >
              {record?.product?.name_en ?? "Product"}
            </h2>
            <p className="truncate text-xs font-medium text-muted-foreground">
              {record?.product?.cas_number
                ? `CAS ${record.product.cas_number}`
                : "No CAS number on file"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2.2} />
          </button>
        </div>

        {isPending && !record ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading this offer…
          </div>
        ) : error && !record ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-destructive">
            <AlertCircle className="size-4" />
            This offer could not be loaded.
          </div>
        ) : record ? (
          <div className="space-y-6 px-6 py-5">
            {record.product && record.product.therapeutic_classes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {record.product.therapeutic_classes.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success ring-1 ring-inset ring-success/15"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : null}

            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Specification" value={record.spec_text} span />
              <Field label="Indication / Use" value={record.product?.indication_text} span />
              <Field label="Qualification / Approval" value={record.qualification_text} />
              <Field label="Packing / Details" value={record.packing_text} />
              <Field label="Material type" value={materialLabel(record.material_type)} />
              <Field label="Market segment" value={labelise(record.market_segment)} />
              <Field label="Commercial status" value={labelise(record.commercial_status)} />
              <Field label="Sterile" value={record.is_sterile ? "Yes" : "No"} />
              <Field label="Price" value={price} />
              <Field
                label="MOQ"
                value={record.moq ? [record.moq, record.moq_unit].filter(Boolean).join(" ") : null}
              />
              {/* Only on the fetched detail — the list row does not carry them. */}
              {data ? (
                <>
                  {data.compendia.length > 0 ? (
                    <Field
                      label="Compendia"
                      span
                      value={data.compendia
                        .map((entry) =>
                          [entry.compendium.code, entry.edition]
                            .filter(Boolean)
                            .join(" "),
                        )
                        .join(", ")}
                    />
                  ) : null}
                  <Field label="Incoterm" value={data.incoterm} />
                  <Field label="Polymorph" value={data.polymorph} />
                  <Field label="Remarks" value={data.remarks} span />
                </>
              ) : null}
            </dl>
          </div>
        ) : null}

        <div className="flex justify-end gap-2.5 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} className={OUTLINE_BUTTON}>
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit();
            }}
            className={GREEN_BUTTON}
          >
            <Pencil strokeWidth={2.2} />
            Edit
          </button>
        </div>
      </div>
    </dialog>
  );
}

function Field({
  label,
  value,
  span = false,
}: {
  label: string;
  value: ReactNode;
  span?: boolean;
}) {
  return (
    <div className={cn("min-w-0", span && "sm:col-span-2")}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm leading-relaxed",
          value ? "font-medium text-foreground" : "italic text-muted-foreground/60",
        )}
      >
        {value || "N/A"}
      </dd>
    </div>
  );
}

/** Never the amount without its unit — per-piece and per-kg differ by orders
 *  of magnitude on the same item. */
function priceLine(offer: OfferListItem | null | undefined): string | null {
  if (!offer?.price_min) return null;
  const amount = offer.price_max
    ? `${offer.price_min}–${offer.price_max}`
    : offer.price_min;
  return [offer.currency, amount, offer.price_unit && `/ ${offer.price_unit}`]
    .filter(Boolean)
    .join(" ");
}

/** The catalogue's own wording — "API", not the enum's "Api". */
function materialLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return (
    CATEGORY_FILTER_OPTIONS.find((option) => option.value === value)?.label ??
    labelise(value)
  );
}

function labelise(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
