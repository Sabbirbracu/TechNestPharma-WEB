import { Suspense } from "react";
import { SourcingRedirect } from "@/components/supplier-enquiries/sourcing-redirect";

/**
 * The old Sourcing address (renamed Supplier Enquiries, 2026-09-17).
 *
 * Kept so bookmarks, notifications and emailed links still land: `?open=<line
 * id>` resolves to the enquiry that line belongs to.
 */
export default function SourcingPage() {
  return (
    <Suspense fallback={null}>
      <SourcingRedirect />
    </Suspense>
  );
}
