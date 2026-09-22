"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyCreateDialog } from "@/components/companies/company-create-dialog";

export function NewCompanyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Same width as Export, on both layouts: two equal halves on a phone,
          a matched pair on desktop. */}
      <Button onClick={() => setOpen(true)} className="w-full sm:w-44">
        <Plus />
        New company
      </Button>
      <CompanyCreateDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
