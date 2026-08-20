import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TenderList } from "@/components/tenders/tender-list";

export const metadata: Metadata = { title: "Tenders" };

export default function TendersPage() {
  return (
    <>
      <PageHeader
        title="Tenders"
        description="Each government bid and the suppliers shortlisted against it. The same product can sit on more than one tender."
      />
      <TenderList />
    </>
  );
}
