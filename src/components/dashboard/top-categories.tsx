"use client";

import Link from "next/link";
import { useProductStats } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import type { ProductStatBucket } from "@/types/api";

/**
 * What the catalogue is made of, as a donut with the total in the hole.
 *
 * Reads `/products/stats` — the same aggregate the products page header uses,
 * so this costs nothing once that page has been visited, and the category
 * counts here can never drift from the ones shown there.
 *
 * Four slices, not the design's three: `other` is a real bucket in this
 * catalogue (everything that is neither API, excipient nor packaging — plus
 * anything still unclassified) and today it is the largest one. Dropping it
 * would make the ring lie about what the centre total counts.
 *
 * Each slice is directly labelled with its name, share and count in the legend,
 * so identity never rests on the colour alone.
 */

const SLICE_COLOR: Record<string, string> = {
  api: "var(--tile-green)",
  excipient: "var(--tile-blue)",
  packaging_material: "var(--tile-purple)",
  other: "var(--tile-teal)",
};

const RADIUS = 54;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** A hairline of surface between neighbouring arcs, in path units. */
const GAP = 2;

export function TopCategories() {
  const { data, isPending, error } = useProductStats();

  if (error) return null;

  const total = data?.buckets.find((bucket) => bucket.key === "total")?.count ?? 0;
  const slices = (data?.buckets ?? []).filter(
    (bucket) => bucket.key !== "total" && bucket.count > 0,
  );

  return (
    <Card className="flex h-full flex-col p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          Top Categories
        </h2>
        <Link
          href="/products"
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all
        </Link>
      </div>

      {isPending ? (
        <div className="mt-6 flex-1 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <div className="mt-5 flex flex-1 flex-col items-center gap-5">
          <Donut slices={slices} total={total} />

          <ul className="w-full space-y-2.5">
            {slices.map((bucket) => (
              <li key={bucket.key} className="flex items-start gap-2">
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SLICE_COLOR[bucket.key] }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">
                    {bucket.label}
                  </span>
                  <span className="block text-xs font-medium tabular-nums text-muted-foreground">
                    {share(bucket.count, total)}% ({bucket.count.toLocaleString()})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Donut({ slices, total }: { slices: ProductStatBucket[]; total: number }) {
  // Each arc starts where the previous one ended. The running sum is worked out
  // up front rather than by mutating an accumulator inside the render map.
  const lengths = slices.map((bucket) =>
    total > 0 ? (bucket.count / total) * CIRCUMFERENCE : 0,
  );
  const arcs = slices.map((bucket, index) => ({
    key: bucket.key,
    start: lengths.slice(0, index).reduce((sum, length) => sum + length, 0),
    // Shrink each arc by the gap so neighbours don't butt together; a slice
    // thinner than the gap would invert, so clamp at zero.
    drawn: Math.max(0, lengths[index] - GAP),
  }));

  return (
    <div className="relative size-[148px] shrink-0">
      <svg viewBox="0 0 148 148" className="size-full -rotate-90">
        <circle
          cx="74"
          cy="74"
          r={RADIUS}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={STROKE}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx="74"
            cy="74"
            r={RADIUS}
            fill="none"
            stroke={SLICE_COLOR[arc.key]}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.drawn} ${CIRCUMFERENCE - arc.drawn}`}
            strokeDashoffset={-arc.start}
          />
        ))}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
          {total.toLocaleString()}
        </span>
        <span className="text-xs font-medium text-muted-foreground">Total</span>
      </div>
    </div>
  );
}

function share(count: number, total: number): string {
  if (total <= 0) return "0";
  const value = (count / total) * 100;
  return value.toFixed(value < 10 ? 1 : 0);
}
