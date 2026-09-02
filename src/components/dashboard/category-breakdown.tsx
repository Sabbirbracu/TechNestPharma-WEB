"use client";

import Link from "next/link";
import { useProductStats } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProductStatBucket } from "@/types/api";

/**
 * What the catalogue is made of.
 *
 * A labelled proportional bar per category rather than a donut. Two reasons:
 * the categories have long names ("Packaging Materials", "Other Materials")
 * that a donut can only reach with leader lines, and "Other" is currently the
 * largest bucket — a pie whose dominant slice is a residual reads as a chart
 * about nothing. Here every row states its own name, count and share, so
 * identity never rests on colour alone and the exact figures are legible.
 *
 * Reads `/products/stats`, the same aggregate the products page header uses, so
 * this costs nothing extra once that page has been visited — and the four
 * category rows partition the catalogue, summing back to the total.
 */

const ROW_STYLES: Record<string, { bar: string; dot: string }> = {
  api: { bar: "bg-tile-green", dot: "bg-tile-green" },
  excipient: { bar: "bg-tile-amber", dot: "bg-tile-amber" },
  packaging_material: { bar: "bg-tile-blue", dot: "bg-tile-blue" },
  other: { bar: "bg-tile-purple", dot: "bg-tile-purple" },
};

export function CategoryBreakdown() {
  const { data, isPending, error } = useProductStats();

  if (error) return null;

  const total = data?.buckets.find((bucket) => bucket.key === "total");
  const rows = data?.buckets.filter((bucket) => bucket.key !== "total") ?? [];

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            Catalogue Mix
          </h2>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground sm:text-sm">
            Every product counted once
          </p>
        </div>
        <Link
          href="/products"
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all
        </Link>
      </div>

      {isPending ? (
        <div className="mt-5 flex-1 space-y-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {(total?.count ?? 0).toLocaleString()}
            <span className="ml-1.5 text-sm font-medium text-muted-foreground">
              products
            </span>
          </p>

          <ul className="mt-4 flex-1 space-y-3.5">
            {rows.map((bucket) => (
              <BreakdownRow
                key={bucket.key}
                bucket={bucket}
                total={total?.count ?? 0}
              />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function BreakdownRow({
  bucket,
  total,
}: {
  bucket: ProductStatBucket;
  total: number;
}) {
  const style = ROW_STYLES[bucket.key] ?? ROW_STYLES.other;
  const share = total > 0 ? (bucket.count / total) * 100 : 0;

  return (
    <li>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
          <span className="truncate text-sm font-semibold text-foreground">
            {bucket.label}
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
          <span className="font-bold text-foreground">
            {bucket.count.toLocaleString()}
          </span>{" "}
          · {share.toFixed(share < 10 ? 1 : 0)}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", style.bar)}
          style={{ width: `${share}%` }}
        />
      </div>
    </li>
  );
}
