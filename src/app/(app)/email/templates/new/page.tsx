import type { Metadata } from "next";
import { EmailTemplateEditor } from "@/components/inbox/email-template-editor";

export const metadata: Metadata = { title: "New email template" };

export default async function NewEmailTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  return (
    <EmailTemplateEditor templateId={null} newKind={kind === "follow_up" ? "follow_up" : "enquiry"} />
  );
}
