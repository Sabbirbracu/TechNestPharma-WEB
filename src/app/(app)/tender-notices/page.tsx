import type { Metadata } from "next";
import { NoticeList } from "@/components/tender-notices/notice-list";

export const metadata: Metadata = { title: "Tender Notices" };

/** The notice inbox — published documents, before they are tenders. */
export default function TenderNoticesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <NoticeList />
    </div>
  );
}
