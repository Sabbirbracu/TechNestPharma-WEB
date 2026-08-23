import { redirect } from "next/navigation";

/** `/admin` itself is no longer linked from the sidebar (replaced by the
 *  Management section's own "Users" and "Activity Logs" pages) — this just
 *  catches anyone with the old URL bookmarked. */
export default function AdminPage() {
  redirect("/admin/users");
}
