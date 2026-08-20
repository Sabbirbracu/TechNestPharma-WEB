import type { Metadata } from "next";
import { TenderDetail } from "@/components/tenders/tender-detail";

export const metadata: Metadata = { title: "Tender" };

export default async function TenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TenderDetail tenderId={Number(id)} />;
}
