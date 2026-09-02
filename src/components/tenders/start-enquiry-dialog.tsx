"use client";

import { useMemo } from "react";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import type { TenderShortlist } from "@/types/api";

/** A shortlist row that's actually eligible for an enquiry — must have a real
 *  supplier attached. Callers narrow to this before opening the dialog. */
export type EnquiryTarget = TenderShortlist & { company_id: number };

/**
 * The tender board's entry into the enquiry dialog.
 *
 * The dialog itself lives in `components/enquiry` because Sourcing opens the
 * same one — see its own file for why the two panes are laid out the way they
 * are. All that is left here is the mapping from a tender shortlist row to the
 * neutral target the dialog reads, and the mode that says these enquiries do
 * not exist yet.
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
  const mapped = useMemo(
    () =>
      targets.map((item) => ({
        key: item.id,
        companyId: item.company_id,
        // Nullable on the shortlist row, required by the dialog — it names
        // the supplier in toasts and in "no email address for …", where an
        // empty string would read as a bug.
        companyName: item.company_name ?? "Unnamed supplier",
        country: item.country,
        specification: item.specification,
        packing: item.packing,
        supplierProductId: item.supplier_product_id,
        // The tender line has no contact of its own; the dropdown starts on
        // "use the company address" and the buyer picks a person if he wants.
        contactPersonId: null,
      })),
    [targets],
  );

  return (
    <EnquiryDialog
      open={open}
      onClose={onClose}
      mode={{ kind: "create", tenderId }}
      productId={productId}
      productName={productName}
      targets={mapped}
      onCreated={onCreated}
      initialQuantity={targets[0]?.quantity ?? null}
      initialQuantityUnit={targets[0]?.quantity_unit ?? null}
    />
  );
}
