"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyCreateDialog } from "@/components/companies/company-create-dialog";

export function NewCompanyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        New company
      </Button>
      <CompanyCreateDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
