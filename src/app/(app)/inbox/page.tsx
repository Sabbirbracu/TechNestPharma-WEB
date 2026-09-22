import { redirect } from "next/navigation";

/** The inbox moved to /email/inbox (2026-09-17). Kept so old bookmarks land. */
export default function LegacyInboxPage() {
  redirect("/email/inbox");
}
