import type { Metadata } from "next";
import { SentWorkspace } from "@/components/inbox/sent-workspace";

export const metadata: Metadata = { title: "Sent" };

/** Sent mail — was the fourth tab of the inbox until 2026-09-17. Owner-only,
 *  enforced by `GET /mailbox/sent`. */
export default function SentPage() {
  return <SentWorkspace />;
}
