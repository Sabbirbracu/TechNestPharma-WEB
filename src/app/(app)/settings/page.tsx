import type { Metadata } from "next";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const metadata: Metadata = { title: "Settings" };

/** Personal account settings — profile, password, two-step verification,
 *  sessions, and notification preferences (SRS FR-AUTH extension). */
export default function SettingsPage() {
  return <SettingsWorkspace />;
}
