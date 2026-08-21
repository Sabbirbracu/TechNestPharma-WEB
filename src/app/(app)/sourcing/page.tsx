import type { Metadata } from "next";
import { SourcingWorkspace } from "@/components/sourcing/sourcing-workspace";

export const metadata: Metadata = { title: "Sourcing" };

/**
 * Supplier outreach (FR-SRC).
 *
 * The whole screen is one client component: the pipeline strip, the filters,
 * the list and the detail panel all read and write the same selection and
 * filter state, and splitting them would mean lifting that state into a
 * provider for no gain.
 */
export default function SourcingPage() {
  return <SourcingWorkspace />;
}
