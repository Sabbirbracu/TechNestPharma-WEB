import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { OffersTable } from "@/components/offers/offers-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Offers" };

export default function OffersPage() {
  return (
    <>
      <PageHeader
        title="Offers"
        description="What each supplier actually sells — spec, packing, and qualification."
      >
        <Button>
          <Plus />
          New offer
        </Button>
      </PageHeader>

      <OffersTable />
    </>
  );
}
