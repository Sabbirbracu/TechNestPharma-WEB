import type { Metadata } from "next";
import { EmailTemplateEditor } from "@/components/inbox/email-template-editor";

export const metadata: Metadata = { title: "Edit email template" };

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmailTemplateEditor templateId={Number(id)} />;
}
