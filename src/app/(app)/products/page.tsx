import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { ProductStatCards } from "@/components/products/product-stat-cards";
import { ProductsTable } from "@/components/products/products-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

/**
 * The products catalogue (FR-PROD).
 *
 * Header tiles describe the whole catalogue and stay fixed while the table
 * below them narrows — the two answer different questions ("how big is the
 * catalogue" vs "what am I looking at"), so the tiles deliberately do not
 * react to the filters.
 */
export default function ProductsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Products
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Manage and explore all raw materials, APIs, excipients and other
            products.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/imports"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Upload strokeWidth={2.25} />
            Import Products
          </Link>
          <Link href="/products/new" className={cn(buttonVariants())}>
            <Plus strokeWidth={2.25} />
            Add Product
          </Link>
        </div>
      </div>

      <ProductStatCards />
      <ProductsTable />
    </div>
  );
}
