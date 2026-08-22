"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { companiesToCsv, downloadCsv, fetchAllCompanies } from "./company-export";

export function CompanyExportButton() {
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      downloadCsv(companiesToCsv(await fetchAllCompanies()));
    } finally {
      setExporting(false);
    }
  }

  return (
    <DropdownMenu
      trigger={(props) => (
        <Button type="button" variant="outline" disabled={exporting} {...props}>
          {exporting ? (
            <Loader2 className="animate-spin" strokeWidth={2.25} />
          ) : (
            <Download strokeWidth={2.25} />
          )}
          Export
        </Button>
      )}
    >
      {(close) => (
        <DropdownMenuItem
          onClick={() => {
            close();
            void exportCsv();
          }}
        >
          <Download />
          Export as CSV
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}
