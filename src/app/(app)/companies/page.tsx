import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { CompaniesTable } from "@/components/companies/companies-table";
import { NewCompanyButton } from "@/components/companies/new-company-button";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        title="Companies"
        description="Manufacturers, traders, and agents in your supplier network."
      >
        {/* Reads ?new=1 from the URL, so it needs a Suspense boundary. */}
        <Suspense fallback={null}>
          <NewCompanyButton />
        </Suspense>
      </PageHeader>

      <CompaniesTable />
    </>
  );
}
