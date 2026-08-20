"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarClock,
  FlaskConical,
  Loader2,
  Package,
  Search,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import {
  TENDER_STATUS_OPTIONS,
  TenderStatusBadge,
  closingLabel,
} from "@/components/tenders/tender-status";
import { TenderStat } from "@/components/tenders/tender-list";
import {
  useRemoveTenderItem,
  useTender,
  useUpdateTender,
} from "@/lib/queries";
import { MATERIAL_TYPE_LABEL, flagFor } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type { TenderItem, TenderStatus } from "@/types/api";

/**
 * One tender and everything shortlisted onto it (FR-TENDER-03).
 *
 * Grouped by product rather than listed flat: the client shortlists two or
 * three suppliers for the same line and then compares them, so the suppliers
 * of one product have to sit together. A flat list sorted by when each row was
 * added scatters exactly the rows that need comparing.
 */
export function TenderDetail({ tenderId }: { tenderId: number }) {
  const router = useRouter();
  const { data: tender, isLoading, error } = useTender(tenderId);
  const updateTender = useUpdateTender(tenderId);
  const removeItem = useRemoveTenderItem();
  const [filter, setFilter] = useState("");

  const groups = useMemo(() => groupByProduct(tender?.items ?? [], filter), [
    tender?.items,
    filter,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tender) {
    return (
      <div
        role="alert"
        className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-12 text-center"
      >
        <AlertCircle className="size-6 text-destructive" />
        <p className="text-sm font-semibold text-destructive">
          {error instanceof Error ? error.message : "Tender not found"}
        </p>
        <Link href="/tenders" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to tenders
        </Link>
      </div>
    );
  }

  const closing = closingLabel(tender.closing_date);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/tenders"
            className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            All tenders
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {tender.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {[tender.reference_no, tender.buyer_name].filter(Boolean).join(" · ") ||
              "No reference number on file"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TenderStatusBadge status={tender.status} />
          <select
            value={tender.status}
            onChange={(event) =>
              updateTender.mutate({ status: event.target.value as TenderStatus })
            }
            aria-label="Tender status"
            className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-semibold outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            {TENDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Link
            href="/search"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
          >
            <Search className="size-3.5" />
            Add from search
          </Link>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <TenderStat
          icon={Package}
          label="Shortlisted"
          value={`${tender.item_count} ${tender.item_count === 1 ? "entry" : "entries"}`}
        />
        <TenderStat
          icon={FlaskConical}
          label="Products"
          value={`${tender.product_count} ${
            tender.product_count === 1 ? "product" : "products"
          }`}
        />
        <TenderStat
          icon={CalendarClock}
          label="Closing"
          value={closing ? `${tender.closing_date} · ${closing.text}` : "No date set"}
        />
      </div>

      {tender.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing shortlisted yet"
          description="Search for a product, then use Shortlist on any result to add it — with its supplier — to this tender."
        >
          <Link href="/search" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            <Search className="size-4" />
            Go to search
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter this shortlist…"
              className="pl-9"
              aria-label="Filter shortlist"
            />
          </div>

          {groups.length === 0 ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing on this tender matches “{filter}”.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <ProductGroup
                  key={group.productId}
                  group={group}
                  onRemove={(itemId) =>
                    removeItem.mutate({ tenderId, itemId })
                  }
                  removingId={
                    removeItem.isPending
                      ? removeItem.variables?.itemId ?? null
                      : null
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/tenders")}
          className="text-muted-foreground"
        >
          Back to tenders
        </Button>
      </div>
    </div>
  );
}

type ProductGroupData = {
  productId: number;
  productName: string;
  productNameCn: string | null;
  casNumber: string | null;
  items: TenderItem[];
};

/** Shortlist rows bucketed by product, filtered on the text the buyer typed. */
function groupByProduct(items: TenderItem[], filter: string): ProductGroupData[] {
  const needle = filter.trim().toLowerCase();
  const matching = needle
    ? items.filter((item) =>
        [item.product_name, item.product_name_cn, item.cas_number, item.company_name]
          .filter((field): field is string => Boolean(field))
          .some((field) => field.toLowerCase().includes(needle)),
      )
    : items;

  const groups = new Map<number, ProductGroupData>();
  for (const item of matching) {
    const existing = groups.get(item.product_id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(item.product_id, {
      productId: item.product_id,
      productName: item.product_name,
      productNameCn: item.product_name_cn,
      casNumber: item.cas_number,
      items: [item],
    });
  }
  return [...groups.values()];
}

function ProductGroup({
  group,
  onRemove,
  removingId,
}: {
  group: ProductGroupData;
  onRemove: (itemId: number) => void;
  removingId: number | null;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-secondary/30 px-4 py-3">
        <div className="min-w-0">
          <h2 className="break-words text-sm font-bold tracking-tight text-foreground">
            {group.productName}
          </h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-muted-foreground">
            {group.productNameCn && <span>{group.productNameCn}</span>}
            <span className="font-mono tabular-nums">
              CAS {group.casNumber || "N/A"}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary ring-1 ring-inset ring-primary/20">
          {group.items.length}{" "}
          {group.items.length === 1 ? "supplier" : "suppliers"}
        </span>
      </header>

      <ul className="divide-y divide-border/50">
        {group.items.map((item) => (
          <li
            key={item.id}
            className="grid gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-accent/25 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-center"
          >
            <div className="min-w-0">
              {item.company_id ? (
                <Link
                  href={`/companies/${item.company_id}`}
                  className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-foreground underline-offset-2 hover:underline"
                >
                  <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.company_name}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold italic text-muted-foreground">
                  <Building2 className="size-3.5" />
                  No supplier chosen
                </span>
              )}
              {item.country && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  {flagFor(item.country_code) && (
                    <span aria-hidden>{flagFor(item.country_code)}</span>
                  )}
                  {item.country}
                </p>
              )}
            </div>

            <p
              className={cn(
                "min-w-0 text-xs",
                item.specification
                  ? "font-medium text-foreground/80"
                  : "italic text-muted-foreground/55",
              )}
              title={item.specification ?? undefined}
            >
              {item.specification || "No spec recorded"}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {item.material_type && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {MATERIAL_TYPE_LABEL[item.material_type]}
                </span>
              )}
              {item.quantity && (
                <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  <BadgeCheck className="size-3" />
                  {item.quantity} {item.quantity_unit ?? ""}
                </span>
              )}
              {item.note && (
                <span className="truncate text-[11px] italic text-muted-foreground">
                  {item.note}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemove(item.id)}
              disabled={removingId === item.id}
              aria-label={`Remove ${item.company_name ?? item.product_name} from this tender`}
              title="Remove from tender"
              className="justify-self-end rounded-lg p-1.5 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
            >
              {removingId === item.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
