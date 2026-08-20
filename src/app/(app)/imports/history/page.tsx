import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ImportHistoryTable } from "@/components/imports/history-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Import history" };

export default function ImportHistoryPage() {
  return (
    <>
      <PageHeader
        title="Import history"
        description="Every batch ever staged, and what it wrote. Committed batches can still be undone."
      >
        <Link
          href="/imports"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <ArrowLeft />
          Back to import
        </Link>
      </PageHeader>

      <div className="mt-4">
        <ImportHistoryTable />
      </div>
    </>
  );
}
