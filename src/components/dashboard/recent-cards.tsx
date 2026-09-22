"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { useCompanies, useProducts } from "@/lib/queries";
import { flagEmoji, primaryCategory } from "@/components/products/product-taxonomy";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardStats, RecentSample } from "@/types/api";
import type { SampleStatus } from "@/types/domain";

/**
 * The three "most recent" feeds.
 *
 * Manufacturers and products need no endpoint of their own: `created_at` is
 * already a whitelisted sort on both list routes, and both list rows already
 * carry what is shown here (a company's country, a product's CAS and material
 * type). So they are the ordinary list calls with `size=5`, sharing TanStack
 * Query's cache with the companies and products pages.
 *
 * Samples ride along on `GET /dashboard` instead — a sample reaches its product
 * and supplier through `supplier_product`, so the join is done server-side
 * rather than fanning out per row from the client.
 */

const RECENT = { sort: "created_at", order: "desc" as const, size: 5, page: 1 };

export function RecentManufacturers() {
  const { data, isPending, error } = useCompanies({
    ...RECENT,
    company_type: "manufacturer",
  });

  return (
    <ListCard
      title="Recent Manufacturers"
      href="/companies"
      isPending={isPending}
      error={Boolean(error)}
      isEmpty={data?.items.length === 0}
      emptyLabel="No manufacturers yet"
    >
      {data?.items.map((company) => {
        const flag = flagEmoji(company.country?.iso2);
        return (
          <Row
            key={company.id}
            href={`/companies/${company.id}`}
            leading={
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile-green-bg text-tile-green">
                <Building2 className="size-4" strokeWidth={2} />
              </span>
            }
            title={company.name_en}
            subtitle={company.country?.name ?? "Country not recorded"}
            trailing={
              flag ? (
                <span className="shrink-0 text-base leading-none" aria-hidden>
                  {flag}
                </span>
              ) : null
            }
          />
        );
      })}
    </ListCard>
  );
}

export function RecentProducts() {
  const { data, isPending, error } = useProducts(RECENT);

  return (
    <ListCard
      title="Recent Products"
      href="/products"
      isPending={isPending}
      error={Boolean(error)}
      isEmpty={data?.items.length === 0}
      emptyLabel="No products yet"
    >
      {data?.items.map((product) => {
        // Never null — falls back to the Uncategorised style, which is what a
        // product with no material_type and no packaging spec should read as.
        const category = primaryCategory(product.material_type, product.is_packaging);
        const Icon = category.icon;
        return (
          <Row
            key={product.id}
            href="/products"
            leading={
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl",
                  category.tile,
                )}
              >
                <Icon className="size-4" strokeWidth={2} />
              </span>
            }
            title={product.name_en}
            subtitle={category.label}
            trailing={
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {product.cas_number ? `CAS: ${product.cas_number}` : "No CAS"}
              </span>
            }
          />
        );
      })}
    </ListCard>
  );
}

/** Status pill colours, matching the sample lifecycle's own semantics. */
const SAMPLE_STATUS: Record<SampleStatus, { label: string; pill: string }> = {
  requested: { label: "Requested", pill: "bg-tile-amber-bg text-tile-amber" },
  promised: { label: "Promised", pill: "bg-tile-amber-bg text-tile-amber" },
  shipped: { label: "Sent", pill: "bg-tile-blue-bg text-tile-blue" },
  received: { label: "Received", pill: "bg-tile-green-bg text-tile-green" },
  under_test: { label: "Testing", pill: "bg-tile-purple-bg text-tile-purple" },
  approved: { label: "Approved", pill: "bg-tile-green-bg text-tile-green" },
  rejected: { label: "Rejected", pill: "bg-tile-rose-bg text-tile-rose" },
  cancelled: { label: "Cancelled", pill: "bg-secondary text-muted-foreground" },
};

export function RecentSamples({
  samples,
  isPending,
  error,
}: {
  samples: RecentSample[] | undefined;
  isPending: boolean;
  error: boolean;
}) {
  return (
    <ListCard
      title="Recent Samples"
      href="/samples"
      isPending={isPending}
      error={error}
      isEmpty={samples?.length === 0}
      emptyLabel="No sample requests yet"
    >
      {samples?.map((sample) => {
        const status = SAMPLE_STATUS[sample.status];
        return (
          <Row
            key={sample.id}
            href="/samples"
            leading={
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  status.pill,
                )}
              >
                {status.label}
              </span>
            }
            title={sample.product_name}
            subtitle={sample.company_name}
            trailing={
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {formatDay(sample.requested_on)}
              </span>
            }
          />
        );
      })}
    </ListCard>
  );
}

/** Shared chrome: title, "View all", and the loading / error / empty states. */
function ListCard({
  title,
  href,
  isPending,
  error,
  isEmpty,
  emptyLabel,
  children,
}: {
  title: string;
  href: string;
  isPending: boolean;
  error: boolean;
  isEmpty: boolean | undefined;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
        <Link
          href={href}
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all
        </Link>
      </div>

      <div className="mt-3 flex-1">
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-[52px] animate-pulse rounded-xl bg-secondary" />
            ))}
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm font-medium text-muted-foreground">
            Could not load this list.
          </p>
        ) : isEmpty ? (
          <p className="py-10 text-center text-sm font-medium text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          // No negative margin: at phone width it pushed the rows 8px past
          // the card on each side and made the whole page scroll sideways.
          <ul className="divide-y divide-border/50">{children}</ul>
        )}
      </div>
    </Card>
  );
}

function Row({
  href,
  leading,
  title,
  subtitle,
  trailing,
}: {
  href: string;
  leading: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">
            {title}
          </span>
          <span className="block truncate text-xs font-medium text-muted-foreground">
            {subtitle}
          </span>
        </span>
        {trailing}
      </Link>
    </li>
  );
}

/** Bucketing for the documents tiles — see DOC_TILES below. */
export type DocumentCounts = DashboardStats["documents_by_type"];

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
