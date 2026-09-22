import type { Metadata } from "next";
import { EnquiryWorkspace } from "@/components/supplier-enquiries/enquiry-workspace";

export const metadata: Metadata = { title: "Supplier Enquiry" };

export default async function SupplierEnquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EnquiryWorkspace enquiryId={Number(id)} />;
}
