import type { Metadata } from "next";
import { ActivityLogWorkspace } from "@/components/admin/activity-log-workspace";

export const metadata: Metadata = { title: "Activity Logs" };

/** The full audit trail — every entity type, filterable by user, entity, and
 *  action (SRS FR-ADM-02). Owner only; the API enforces it. */
export default function AdminActivityPage() {
  return <ActivityLogWorkspace />;
}
