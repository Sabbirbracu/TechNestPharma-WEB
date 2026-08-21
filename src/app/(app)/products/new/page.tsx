import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCreateForm } from "@/components/products/product-create-form";

export const metadata: Metadata = { title: "Add Product" };

/**
 * A dedicated page rather than a modal (FR-PROD, FR-OFFER): the product's own
 * fields, a supplier picker that can expand into a full new-company form, and
 * that supplier's offer details are three sections' worth of content — more
 * than a dialog has room to lay out side by side, and nesting a company form
 * inside a product-form dialog has nowhere clean to go.
 */
export default function NewProductPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.5} />
          Back to Products
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Add Product
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Catalogue a new substance and the supplier offering it.
        </p>
      </div>

      <ProductCreateForm />
    </div>
  );
}
