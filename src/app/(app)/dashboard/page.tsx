import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const metadata: Metadata = { title: "Dashboard" };

/** Title and greeting live inside the client component — it needs the signed-in
 *  user's name and the resolved date range for the header row anyway. */
export default function DashboardPage() {
  return <DashboardContent />;
}
