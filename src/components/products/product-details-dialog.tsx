"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BadgeCheck, Calendar, Loader2, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHANNEL_META, hrefForChannel } from "@/components/contact-channel";
import {
  ShortlistMenu,
  shortlistKey,
  groupMemberships,
} from "@/components/tenders/shortlist-menu";
import {
  useProduct,
  useProductSuppliers,
  useShortlistMemberships,
} from "@/lib/queries";
import { ProductFormDialog } from "./product-form-dialog";
import { cn } from "@/lib/utils";
import {
  CATEGORY_STYLES,
  applicationLabel,
  flagEmoji,
  primaryCategory,
} from "./product-taxonomy";
import type { MaterialType } from "@/types/domain";
import type { ProductListItem, SearchSupplier } from "@/types/api";

/**
 * One product in full, without leaving the table.
 *
 * A dialog rather than a route because the reader is mid-scan: navigating away
 * costs them the page, the filters, and their place in the list.
 *
 * Two columns, because the two halves answer different questions and a reader
 * comparing them should not have to scroll between them. The left column — what
 * the substance *is* — is fixed and always visible. Only the supplier list on
 * the right scrolls, since that is the one part with no natural length.
 */
export function ProductDetailsDialog({
  product,
  open,
  onClose,
}: {
  product: ProductListItem;
  open: boolean;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // While the edit form is up it owns Escape — closing both at once would
      // discard an in-progress edit the user only meant to back out of.
      if (event.key === "Escape" && !editing) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, editing]);

  const { data, isPending } = useProduct(open ? product.id : null);
  const { data: supplierPage, isPending: suppliersPending } = useProductSuppliers(
    open ? product.id : null,
  );
  const suppliers = useMemo(() => supplierPage?.items ?? [], [supplierPage]);

  // Which tenders this product already sits on, so the header can say so.
  const { data: memberships } = useShortlistMemberships(open ? [product.id] : []);
  const productMemberships =
    groupMemberships(memberships).get(shortlistKey(product.id, null)) ?? [];

  // Specification, packing and qualification live on the offer, not the product
  // (D14) — two suppliers describe the same substance differently. Rolled up to
  // the distinct set here so the product panel can show "what this is sold as"
  // in one place; the per-supplier detail is still on each card.
  const offerFacts = useMemo(
    () => ({
      specifications: distinct(suppliers.map((s) => s.specification)),
      packings: distinct(suppliers.map((s) => s.packing)),
      qualifications: distinct(suppliers.map((s) => s.qualification)),
      offeredAs: distinct(suppliers.map((s) => s.material_type)),
    }),
    [suppliers],
  );

  if (!open) return null;

  const category = primaryCategory(
    product.facets.material_types,
    product.is_packaging,
  );
  const Icon = category.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.name_en}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-xl sm:max-w-5xl sm:rounded-2xl lg:max-w-6xl">
        <header className="flex items-start gap-3.5 border-b border-border/60 p-5 sm:p-6">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              category.tile,
            )}
          >
            <Icon className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">
              {product.name_en}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {product.cas_number && (
                <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted-foreground">
                  CAS {product.cas_number}
                  {product.cas_is_verified && (
                    <BadgeCheck
                      className="size-4 text-success"
                      aria-label="Checksum verified"
                    />
                  )}
                </span>
              )}
              {(product.name_cn || product.variant) && (
                <span className="text-sm font-medium text-muted-foreground">
                  {[product.name_cn, product.variant].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            {/* Shortlist state belongs in the header: a buyer opening a product
                they already put on a bid needs to know before, not after, they
                start comparing suppliers. */}
            {productMemberships.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {productMemberships.map((membership) => (
                  <Link
                    key={membership.tender_id}
                    href={`/tenders/${membership.tender_id}`}
                    className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success ring-1 ring-inset ring-success/20 transition-colors hover:bg-success/20"
                  >
                    {membership.tender_name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* --- What the substance is ------------------------------------- */}
          <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
            {product.indication_text && (
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {product.indication_text}
              </p>
            )}

            <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <Detail label="Category">
                <Badge className={cn("border-transparent", category.badge)}>
                  {category.label}
                </Badge>
              </Detail>

              <Detail label="Therapeutic class">
                {product.therapeutic_classes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {product.therapeutic_classes.map((name) => (
                      <Badge key={name} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <NotAvailable />
                )}
              </Detail>

              <Detail label="Molecular formula">
                {isPending ? (
                  <Skeleton />
                ) : data?.molecular_formula ? (
                  <span className="font-mono text-sm">{data.molecular_formula}</span>
                ) : (
                  <NotAvailable />
                )}
              </Detail>

              <Detail label="Pharmacopoeia">
                <ValueOrNa value={product.facets.compendia.join(", ")} />
              </Detail>

              <Detail label="Offered as">
                {suppliersPending ? (
                  <Skeleton />
                ) : offerFacts.offeredAs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {offerFacts.offeredAs.map((type) => (
                      <Badge
                        key={type}
                        className={cn(
                          "border-transparent",
                          CATEGORY_STYLES[type as MaterialType]?.badge ?? category.badge,
                        )}
                      >
                        {CATEGORY_STYLES[type as MaterialType]?.label ?? type}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <NotAvailable />
                )}
              </Detail>

              <Detail label="Applications">
                <ValueOrNa
                  value={product.facets.applications.map(applicationLabel).join(", ")}
                />
              </Detail>

              {/* Rolled up across suppliers — see offerFacts above. When they
                  disagree, every distinct answer is listed rather than one
                  being picked arbitrarily. */}
              <Detail label="Specification" className="sm:col-span-2">
                <ListOrNa values={offerFacts.specifications} loading={suppliersPending} />
              </Detail>

              <Detail label="Packing details" className="sm:col-span-2">
                <ListOrNa values={offerFacts.packings} loading={suppliersPending} />
              </Detail>

              <Detail label="Qualification" className="sm:col-span-2">
                <ListOrNa values={offerFacts.qualifications} loading={suppliersPending} />
              </Detail>

              <Detail label="Supplier countries">
                {product.facets.countries.length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    {product.facets.countries.map((country) => (
                      <span
                        key={country.id}
                        className="inline-flex items-center gap-1.5 text-sm font-medium"
                      >
                        <span aria-hidden className="text-base leading-none">
                          {flagEmoji(country.iso2)}
                        </span>
                        {country.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <NotAvailable />
                )}
              </Detail>

              <Detail label="Added on">
                {product.created_at ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="size-4 text-muted-foreground" strokeWidth={2} />
                    {formatAddedOn(product.created_at)}
                  </span>
                ) : (
                  <NotAvailable />
                )}
              </Detail>
            </dl>

            {data && data.synonyms.length > 0 && (
              <Section label="Also known as">
                <div className="flex flex-wrap gap-1.5">
                  {data.synonyms.map((synonym) => (
                    <Badge key={synonym.id} variant="secondary">
                      {synonym.synonym}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {data?.packaging_spec && (
              <Section label="Packaging specification">
                <dl className="grid gap-3 sm:grid-cols-3">
                  {specEntries(data.packaging_spec).map(([label, value]) => (
                    <Detail key={label} label={label}>
                      <span className="text-sm font-medium">{value}</span>
                    </Detail>
                  ))}
                </dl>
              </Section>
            )}

            {data?.notes && (
              <Section label="Notes">
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-muted-foreground">
                  {data.notes}
                </p>
              </Section>
            )}
          </div>

          {/* --- Who sells it ---------------------------------------------- */}
          <div className="flex min-h-0 flex-col border-t border-border/60 bg-secondary/20 lg:border-l lg:border-t-0">
            <h3 className="shrink-0 border-b border-border/60 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Suppliers ({supplierPage?.total ?? product.facets.supplier_count})
            </h3>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
              {suppliersPending ? (
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading suppliers…
                </div>
              ) : suppliers.length === 0 ? (
                <p className="text-sm font-medium text-muted-foreground">
                  No supplier is linked to this product yet.
                </p>
              ) : (
                <>
                  {suppliers.map((supplier) => (
                    <SupplierCard
                      key={`${supplier.company_id}-${supplier.offer_id ?? 0}`}
                      supplier={supplier}
                    />
                  ))}
                  {supplierPage && supplierPage.total > suppliers.length && (
                    <p className="px-1 text-xs font-medium text-muted-foreground">
                      Showing the first {suppliers.length} of {supplierPage.total}.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border/60 bg-secondary/30 p-4 sm:px-6">
          <ShortlistMenu
            productId={product.id}
            companyId={null}
            productName={product.name_en}
            memberships={productMemberships}
            variant="compact"
            className="w-40"
          />
          <Button type="button" onClick={() => setEditing(true)}>
            <Pencil strokeWidth={2.25} />
            Edit product
          </Button>
        </footer>
      </div>

      {/* A native <dialog> opened with showModal, so it sits in the browser's
          top layer and stacks above this portal without a z-index fight. */}
      <ProductFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        product={product}
      />
    </div>,
    document.body,
  );
}

/**
 * One supplier of this product: where they are, and the one contact route worth
 * trying first. Their own spec and packing are rolled up into the product panel
 * on the left, so this stays focused on reaching them.
 */
function SupplierCard({ supplier }: { supplier: SearchSupplier }) {
  const flag = flagEmoji(supplier.country_code);
  const contact = supplier.contact;
  const channels = contact?.channels ?? [];
  const shown = channels.slice(0, 2);
  const hidden = channels.length - shown.length;

  return (
    <div className="space-y-2.5 rounded-xl border border-border/60 bg-card p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-[11px] font-bold uppercase text-muted-foreground ring-1 ring-inset ring-border/50">
          {initialsOf(supplier.company_name)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/companies/${supplier.company_id}`}
            className="block text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary"
          >
            {supplier.company_name}
          </Link>
          {(supplier.country || supplier.city) && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {flag && (
                <span aria-hidden className="text-sm leading-none">
                  {flag}
                </span>
              )}
              {[supplier.city, supplier.country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {contact ? (
        <div className="space-y-1.5 border-t border-border/50 pt-2.5">
          <p className="text-sm font-semibold text-foreground">
            {contact.name_en}
            {contact.designation && (
              <span className="ml-1.5 font-medium text-muted-foreground">
                · {contact.designation}
              </span>
            )}
          </p>
          <ul className="space-y-1">
            {shown.map((channel) => {
              const meta = CHANNEL_META[channel.channel];
              const href = hrefForChannel(channel.channel, channel.value);
              const Icon = meta.Icon;
              return (
                <li
                  key={`${channel.channel}-${channel.value}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <Icon
                    className={cn("size-3.5 shrink-0", meta.tint)}
                    aria-label={meta.label}
                  />
                  {href ? (
                    <a
                      href={href}
                      className="truncate font-medium text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {channel.value}
                    </a>
                  ) : (
                    <span className="truncate font-medium text-foreground">
                      {channel.value}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {hidden > 0 && (
            <Link
              href={`/companies/${supplier.company_id}`}
              className="inline-block text-xs font-semibold text-primary transition-colors hover:underline"
            >
              View {hidden} more contact detail{hidden === 1 ? "" : "s"}
            </Link>
          )}
        </div>
      ) : supplier.fallback_email ? (
        // No named contact on file (D11) — the department address is the only
        // route, and saying so beats showing an empty contact block.
        <div className="space-y-1 border-t border-border/50 pt-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            No named contact — department address only
          </p>
          <a
            href={`mailto:${supplier.fallback_email}`}
            className="break-all text-xs font-semibold text-primary transition-colors hover:underline"
          >
            {supplier.fallback_email}
          </a>
        </div>
      ) : (
        <p className="border-t border-border/50 pt-2.5 text-xs font-medium text-muted-foreground">
          No contact details on file.
        </p>
      )}
    </div>
  );
}

function Detail({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border/60 pt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}

function NotAvailable() {
  return <span className="text-sm font-medium text-muted-foreground/70">N/A</span>;
}

function ValueOrNa({ value }: { value: string }) {
  return value ? (
    <span className="text-sm font-medium">{value}</span>
  ) : (
    <NotAvailable />
  );
}

/** Several suppliers can describe the same substance differently; every
 *  distinct answer is listed rather than one being picked arbitrarily. */
function ListOrNa({
  values,
  loading,
}: {
  values: string[];
  loading: boolean;
}) {
  if (loading) return <Skeleton />;
  if (values.length === 0) return <NotAvailable />;
  if (values.length === 1) {
    return <span className="text-sm font-medium">{values[0]}</span>;
  }
  return (
    <ul className="space-y-0.5">
      {values.map((value) => (
        <li key={value} className="text-sm font-medium leading-snug">
          • {value}
        </li>
      ))}
    </ul>
  );
}

function Skeleton() {
  return <span className="block h-5 w-24 animate-pulse rounded-md bg-muted" />;
}

/** Distinct, non-empty, in first-seen order. */
function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/** Only the spec fields this product actually carries — a bottle has no
 *  thickness, and rendering a column of dashes says nothing. */
function specEntries(
  spec: NonNullable<import("@/types/api").PackagingSpec>,
): [string, string][] {
  const candidates: [string, string | null][] = [
    ["Type", spec.pkg_type],
    ["Subtype", spec.subtype],
    ["Material", spec.material_code],
    ["Size", spec.size_mm && `${spec.size_mm} mm`],
    ["Thickness", spec.thickness_mm && `${spec.thickness_mm} mm`],
    ["Width", spec.width_mm && `${spec.width_mm} mm`],
    ["Volume", spec.volume_ml && `${spec.volume_ml} ml`],
    ["Unit weight", spec.unit_weight_g && `${spec.unit_weight_g} g`],
    ["Coating", spec.coating],
    ["Sterilisation", spec.sterilization],
    ["Colour", spec.colour],
    ["Standard", spec.standard_ref],
  ];
  return candidates.filter((entry): entry is [string, string] => Boolean(entry[1]));
}

/** "Shandong Tianming Pharmaceutical Group" → "ST". Two letters tells adjacent
 *  cards apart without competing with the name beside it. */
function initialsOf(name: string): string {
  return name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}

export function formatAddedOn(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
