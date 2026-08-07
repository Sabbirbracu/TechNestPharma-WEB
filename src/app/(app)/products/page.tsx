import type { Metadata } from "next";
import { FlaskConical, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Substances by canonical name, CAS, synonyms, and variant."
      >
        <Button>
          <Plus />
          New product
        </Button>
      </PageHeader>

      <EmptyState
        icon={FlaskConical}
        title="No products yet"
        description="CAS identifies a substance, not a sellable product — the same CAS can appear many times, distinguished by variant."
      />
    </>
  );
}
