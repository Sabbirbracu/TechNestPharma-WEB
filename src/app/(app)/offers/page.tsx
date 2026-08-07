import type { Metadata } from "next";
import { Handshake, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offers" };

export default function OffersPage() {
  return (
    <>
      <PageHeader
        title="Offers"
        description="One row is “this company offers this product” — the heart of the catalogue."
      >
        <Button>
          <Plus />
          New offer
        </Button>
      </PageHeader>

      <EmptyState
        icon={Handshake}
        title="No offers yet"
        description="Offers carry material type, compendia, regulatory filings, and commercial status. Filter them and compare candidates side by side."
      />
    </>
  );
}
