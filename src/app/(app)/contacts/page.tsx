import type { Metadata } from "next";
import { Users, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Contacts"
        description="People and their channels — mobile, WeChat, WhatsApp, and QR."
      >
        <Button>
          <Plus />
          New contact
        </Button>
      </PageHeader>

      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Every contact belongs to a company and can carry any number of typed channels, including WeChat and WhatsApp QR images."
      />
    </>
  );
}
