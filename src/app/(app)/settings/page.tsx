import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const metadata: Metadata = { title: "Settings" };

/** Personal account settings — profile, password, two-step verification,
 *  sessions, notification preferences (SRS FR-AUTH extension), and the
 *  supplier mailbox connection.
 *
 *  The Suspense boundary is required: the workspace reads `?tab=` with
 *  `useSearchParams` to open on a linked section, which opts the tree into
 *  client-side rendering and needs a fallback for the static shell. */
export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsWorkspace />
    </Suspense>
  );
}
