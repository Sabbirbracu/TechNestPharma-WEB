import { BadgeCheck, FlaskConical, Stethoscope, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupplierRow } from "@/components/search/supplier-row";
import type { SearchResults } from "@/types/api";

type Product = SearchResults["products"][number];

/**
 * Premium search result card - shows product identity and supplier details
 * inline without requiring a second click.
 */
export function ProductResultCard({ product }: { product: Product }) {
  const hiddenCount = product.supplier_count - product.suppliers.length;

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Product header - premium styling */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-secondary/50 to-secondary/30 px-6 py-5">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <FlaskConical className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight text-foreground leading-tight">
              {product.name_en}
            </h3>
            {(product.name_cn || product.variant) && (
              <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                {[product.name_cn, product.variant].filter(Boolean).join(" · ")}
              </p>
            )}
            {product.therapeutic_classes.length > 0 && (
              <div className="mt-2.5 flex items-center gap-2.5">
                <p className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Therapeutic Class:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.therapeutic_classes.map((name) => (
                    <Badge key={name} variant="secondary" className="text-[11px] font-semibold">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CAS Number - premium badge */}
        {product.cas_number && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm ring-1 ring-border/20">
            <div className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CAS</p>
              <p className="mt-0.5 font-mono text-sm font-bold text-foreground tabular-nums">
                {product.cas_number}
              </p>
            </div>
            {product.cas_is_verified && (
              <BadgeCheck
                className="size-5 text-success"
                aria-label="Checksum verified"
                strokeWidth={2.5}
              />
            )}
          </div>
        )}
      </div>

      {/* Product details */}
      <div className="p-6">
        {product.indication_text && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-accent/30 p-4">
            <Stethoscope className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2} />
            <p className="text-sm leading-relaxed">
              <span className="font-bold text-foreground">Indication: </span>
              <span className="text-muted-foreground">{product.indication_text}</span>
            </p>
          </div>
        )}

        {/* Suppliers section */}
        {product.suppliers.length === 0 ? (
          <div className="flex min-h-[100px] items-center justify-center rounded-xl border border-dashed border-border bg-secondary/20 p-6">
            <p className="text-sm font-medium text-muted-foreground">
              No supplier on file for this product yet.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="size-4 text-primary" strokeWidth={2} />
              <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">
                {product.supplier_count === 1
                  ? "1 Supplier"
                  : `${product.supplier_count} Suppliers`}
              </h4>
            </div>
            <ul className="space-y-3">
              {product.suppliers.map((supplier) => (
                <SupplierRow key={supplier.company_id} supplier={supplier} />
              ))}
            </ul>
            {hiddenCount > 0 && (
              <div className="mt-4 rounded-lg bg-muted/50 px-4 py-2.5 text-center">
                <p className="text-xs font-semibold text-muted-foreground">
                  +{hiddenCount} more supplier{hiddenCount === 1 ? "" : "s"} available — 
                  open the Offers list to see all
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
