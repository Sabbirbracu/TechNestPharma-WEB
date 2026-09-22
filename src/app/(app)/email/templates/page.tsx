import type { Metadata } from "next";
import { EmailTemplatesWorkspace } from "@/components/inbox/email-templates-workspace";

export const metadata: Metadata = { title: "Email templates" };

/** Email → Templates (2026-09-22): saved wordings for enquiry and follow-up
 *  emails, picked in the Send / New Enquiry dialogs. */
export default function EmailTemplatesPage() {
  return <EmailTemplatesWorkspace />;
}
