import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProductsTable } from "@/components/products/products-table";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Products" };

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Substances in the catalogue, keyed by name, variant, and CAS number."
      >
        <Button>
          <Plus />
          New product
        </Button>
      </PageHeader>

      <ProductsTable />
    </>
  );
}
