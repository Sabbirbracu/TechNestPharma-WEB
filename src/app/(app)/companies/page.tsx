import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { CompanyStatCards } from "@/components/companies/company-stat-cards";
import { CompaniesTable } from "@/components/companies/companies-table";
import { CompanyExportButton } from "@/components/companies/company-export-button";
import { NewCompanyButton } from "@/components/companies/new-company-button";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tile-blue-bg text-tile-blue ring-1 ring-inset ring-tile-blue/15 sm:size-12">
            <Building2 className="size-5 sm:size-[22px]" strokeWidth={2} />
          </span>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Companies
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Manage your supplier network of manufacturers, traders and agents.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {/* Reads ?new=1 from the URL, so it needs a Suspense boundary. */}
          <Suspense fallback={null}>
            <NewCompanyButton />
          </Suspense>
          <CompanyExportButton />
        </div>
      </div>

      <CompanyStatCards />
      <CompaniesTable />
    </div>
  );
}
