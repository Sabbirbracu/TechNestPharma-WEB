import type { Metadata } from "next";
import { EnquiriesPage } from "@/components/supplier-enquiries/enquiries-page";

export const metadata: Metadata = { title: "Supplier Enquiries" };

/** Supplier Enquiries (FR-SRC, redesigned 2026-09-17): one row per supplier
 *  enquiry — a supplier asked about one or more products. */
export default function SupplierEnquiriesPage() {
  return <EnquiriesPage />;
}
