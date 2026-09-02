import type { Metadata } from "next";
import { InboxWorkspace } from "@/components/inbox/inbox-workspace";

export const metadata: Metadata = { title: "Inbox" };

/**
 * The mailbox inbox (FR-SRC, 2026-08-31).
 *
 * Owner-only, enforced by the API rather than here: this reads the client's own
 * Gmail, not one supplier conversation the ERP started. The nav entry is
 * hidden from staff as a courtesy; the routes are what actually refuse them.
 */
export default function InboxPage() {
  return <InboxWorkspace />;
}
