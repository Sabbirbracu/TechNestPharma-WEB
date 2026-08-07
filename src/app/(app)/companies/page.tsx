import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        title="Companies"
        description="Manufacturers, traders, and agents in your supplier network."
      >
        <Button>
          <Plus />
          New company
        </Button>
      </PageHeader>

      <EmptyState
        icon={Building2}
        title="No companies yet"
        description="Add a supplier by hand, or bring the catalogue in through Import. Filters by country, type, status, and material type will appear here."
      >
        <Button variant="outline">
          <Plus />
          Add the first company
        </Button>
      </EmptyState>
    </>
  );
}
