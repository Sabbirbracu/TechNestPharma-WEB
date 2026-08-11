import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at your supplier companies, with their typed channels."
      >
        <Button>
          <Plus />
          New contact
        </Button>
      </PageHeader>

      <ContactsTable />
    </>
  );
}
