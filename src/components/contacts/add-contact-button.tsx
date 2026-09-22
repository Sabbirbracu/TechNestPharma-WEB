"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";

export function AddContactButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-44">
        <UserRoundPlus strokeWidth={2.25} />
        Add Contact
      </Button>
      <AddContactDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
