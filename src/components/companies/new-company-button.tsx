"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyCreateDialog } from "@/components/companies/company-create-dialog";

/**
 * The manual-entry entry point (Channel A).
 *
 * Also opens itself when the URL carries `?new=1`, which is how the Import
 * screen's "Start entry" card hands over — the two are the same action, and a
 * link that lands the user on a list they then have to hunt through would not
 * be.
 */
export function NewCompanyButton() {
  const params = useSearchParams();
  // Read once, on mount: the query string decides whether the dialog starts
  // open, and after that the user's clicks own it. Syncing it in an effect
  // would re-open the dialog every time they closed it.
  const [open, setOpen] = useState(() => params.get("new") === "1");

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
