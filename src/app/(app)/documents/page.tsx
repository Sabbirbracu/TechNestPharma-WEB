import type { Metadata } from "next";
import { FileText, Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Documents"
        description="Leaflets, COAs, certificates, and business cards in one library."
      >
        <Button>
          <Upload />
          Upload
        </Button>
      </PageHeader>

      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Files are typed, checksummed for de-duplication, and served only through an authenticated endpoint — never statically."
      />
    </>
  );
}
