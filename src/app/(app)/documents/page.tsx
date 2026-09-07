import type { Metadata } from "next";
import { DocumentsContent } from "@/components/documents/documents-content";

export const metadata: Metadata = { title: "Documents" };

/**
 * The document library (FR-DOC).
 *
 * Deliberately not "every file in the system". A tender notice is a source
 * record with its own table and its own lifecycle, and a mail attachment lives
 * in Gmail until somebody decides it is worth keeping — both reach this library
 * only by an explicit act. What is here is evidence: the COAs, master files,
 * certificates and spec sheets filed against a supplier, a product, an offer, a
 * sample or an inquiry.
 *
 * The header renders inside the client component rather than through
 * `PageHeader`, because "Add Document" drives the upload panel's state.
 */
export default function DocumentsPage() {
  return <DocumentsContent />;
}
