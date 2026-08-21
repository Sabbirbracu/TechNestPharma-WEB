"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, Mail, Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  ShortlistChip,
  ShortlistMenu,
} from "@/components/tenders/shortlist-menu";
import { ResultDetailsDialog } from "@/components/search/result-details-dialog";
import { MATERIAL_TYPE_LABEL, flagFor, type ResultRow } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type { ShortlistMembership } from "@/types/api";

/**
 * The dense alternative to `ResultCard`, for scanning many suppliers of the
 * same substance at once: same facts, one line each, spec and description
 * traded away for row count.
 */
export function ResultRowCompact({
  row,
  memberships = [],
}: {
  row: ResultRow;
  memberships?: ShortlistMembership[];
}) {
  const { product, supplier } = row;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const flag = flagFor(supplier.country_code);
  const email = supplier.contact?.channels.find((c) => c.channel === "email")?.value
    ?? supplier.fallback_email;
  const phone = supplier.contact?.channels.find(
    (c) => c.channel === "phone" || c.channel === "mobile",
  )?.value;

  return (
    <article className="grid items-center gap-x-5 gap-y-2 border-b border-border/50 px-5 py-3.5 transition-colors first:rounded-t-2xl last:rounded-b-2xl last:border-b-0 hover:bg-accent/25 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-bold tracking-tight text-foreground">
            {product.name_en}
          </span>
          {supplier.material_type && (
            <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-inset ring-primary/20">
              {MATERIAL_TYPE_LABEL[supplier.material_type]}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <span className="font-mono tabular-nums">{product.cas_number || "N/A"}</span>
          {product.cas_number && product.cas_is_verified && (
            <BadgeCheck className="size-3 text-success" strokeWidth={2.5} />
          )}
        </p>
      </div>

      <p
        className={cn(
          "min-w-0 truncate text-xs",
          supplier.specification
            ? "font-medium text-foreground/80"
            : "italic text-muted-foreground/55",
        )}
        title={supplier.specification ?? undefined}
      >
        {supplier.specification || "N/A"}
      </p>

      <div className="min-w-0">
        <Link
          href={`/companies/${supplier.company_id}`}
          className="block truncate text-xs font-bold text-foreground underline-offset-2 hover:underline"
        >
          {supplier.company_name}
        </Link>
        {supplier.country && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            {flag && <span aria-hidden>{flag}</span>}
            <span className="truncate">{supplier.country}</span>
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-0.5">
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground/80 hover:text-primary"
          >
            <Mail className="size-3 shrink-0 text-muted-foreground/70" strokeWidth={2} />
            <span className="truncate">{email}</span>
          </a>
        )}
        {phone && (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground/80 hover:text-primary"
          >
            <Phone className="size-3 shrink-0 text-muted-foreground/70" strokeWidth={2} />
            <span className="truncate">{phone}</span>
          </a>
        )}
        {!email && !phone && (
          <span className="text-[11px] font-medium italic text-muted-foreground/60">
            No contact on file
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ShortlistMenu
          productId={product.id}
          companyId={supplier.company_id}
          offerId={supplier.offer_id}
          productName={product.name_en}
          memberships={memberships}
          variant="compact"
          className="w-[132px]"
        />
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "h-8 bg-success/10 text-success ring-1 ring-inset ring-success/20 hover:bg-success/15",
          )}
        >
          View
        </button>
      </div>

      <ShortlistChip
        memberships={memberships}
        className="w-auto lg:col-start-5 lg:justify-self-end"
      />

      <ResultDetailsDialog
        row={row}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </article>
  );
}
