import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompaniesTable } from "@/components/companies/companies-table";
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

      <CompaniesTable />
    </>
  );
}
