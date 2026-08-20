import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ImportPreviewGrid } from "@/components/imports/preview-grid";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Import preview" };

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId) || batchId < 1) notFound();

  return (
    <>
      <PageHeader
        title={`Import batch #${batchId}`}
        description="Check every row here. Nothing is written until you commit, and a commit can be undone."
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
        <ImportPreviewGrid batchId={batchId} />
      </div>
    </>
  );
}
