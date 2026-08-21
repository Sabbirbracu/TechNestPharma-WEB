import type { Metadata } from "next";
import { TenderWorkspace } from "@/components/tenders/tender-workspace";

export const metadata: Metadata = { title: "Tenders" };

/**
 * Government and private tender board (FR-TENDER).
 *
 * One client component, same reasoning as Sourcing: the stat strip, tabs,
 * filters, table, and sidebar all read and write the same selection and
 * filter state, and splitting them would mean lifting that state into a
 * provider for no gain.
 */
export default function TendersPage() {
  return <TenderWorkspace />;
}
