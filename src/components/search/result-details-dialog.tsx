"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ExternalLink,
  FlaskConical,
  Loader2,
  MapPin,
  Package,
  User,
  X,
} from "lucide-react";
import { CHANNEL_META, hrefForChannel } from "@/components/contact-channel";
import { buttonVariants } from "@/components/ui/button";
import { useCompany, useOffer } from "@/lib/queries";
import { MATERIAL_TYPE_LABEL, flagFor, type ResultRow } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type { CompanyContact } from "@/types/api";

/**
 * Everything about one search result, without leaving the results.
 *
 * The card carries what a buyer needs to *triage* a row; this carries what they
 * need to *judge* it — the full offer (price band, MOQ, incoterm, compendia)
 * and the whole company with every contact. It is a dialog rather than the
 * company page on purpose: the buyer is mid-scan through a result list, and
 * navigating away costs them the list, the filters, and their place in it.
 *
 * The offer and company are fetched only once the dialog opens, so a page of
 * 50 results still makes zero extra requests until one is actually inspected.
 */
export function ResultDetailsDialog({
  row,
  open,
  onClose,
}: {
  row: ResultRow;
  open: boolean;
  onClose: () => void;
}) {
  // Escape closes; the page behind must not scroll while a modal is over it.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  // `open` only ever becomes true from a user interaction, i.e. after
  // hydration — so there is no server/client mismatch to guard against here
  // beyond `document` not existing during the server render.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
        // Only a press that both starts and ends on the backdrop closes —
        // dragging a text selection out of the panel must not dismiss it.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <DialogBody row={row} onClose={onClose} />
    </div>,
    document.body,
  );
}

function DialogBody({ row, onClose }: { row: ResultRow; onClose: () => void }) {
  const { product, supplier } = row;
  const { data: offer, isLoading: offerLoading } = useOffer(supplier.offer_id);
  const { data: company, isLoading: companyLoading } = useCompany(supplier.company_id);
  const flag = flagFor(supplier.country_code);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name_en} — ${supplier.company_name}`}
      className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4 pr-12">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
          <FlaskConical className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-base font-bold leading-snug tracking-tight text-foreground">
              {product.name_en}
            </h2>
            {supplier.material_type && (
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary ring-1 ring-inset ring-primary/20">
                {MATERIAL_TYPE_LABEL[supplier.material_type]}
              </span>
            )}
          </div>
          {(product.name_cn || product.variant) && (
            <p className="mt-0.5 break-words text-xs font-medium text-muted-foreground">
              {[product.name_cn, product.variant].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-foreground/75">
            <span className="text-muted-foreground">CAS No:</span>
            <span className="break-all font-mono font-semibold tabular-nums">
              {product.cas_number || "N/A"}
            </span>
            {product.cas_number && product.cas_is_verified && (
              <BadgeCheck
                className="size-4 text-success"
                strokeWidth={2.5}
                aria-label="CAS checksum verified"
              />
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        autoFocus
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" strokeWidth={2.5} />
      </button>

      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
        {/* --- Product ---------------------------------------------------- */}
        <Section icon={FlaskConical} title="Product">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Fact
              label="Therapeutic class"
              value={product.therapeutic_classes.join(", ") || null}
            />
            <Fact label="Variant" value={product.variant} />
            <Fact
              label="Indication"
              value={product.indication_text}
              className="sm:col-span-2"
            />
          </dl>
        </Section>

        {/* --- This supplier's offer -------------------------------------- */}
        <Section icon={Package} title="This supplier's offer">
          {offerLoading ? (
            <Pending />
          ) : (
            <>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact
                  label="Specification"
                  value={offer?.spec_text ?? supplier.specification}
                  className="sm:col-span-2"
                />
                <Fact
                  label="Qualification"
                  value={offer?.qualification_text ?? supplier.qualification}
                  className="sm:col-span-2"
                />
                <Fact
                  label="Packing"
                  value={offer?.packing_text ?? supplier.packing}
                  className="sm:col-span-2"
                />
                <Fact label="Market segment" value={humanise(offer?.market_segment)} />
                <Fact
                  label="Commercial status"
                  value={humanise(offer?.commercial_status)}
                />
                <Fact label="Application" value={humanise(offer?.application)} />
                <Fact label="Polymorph" value={offer?.polymorph ?? null} />
                {/* Never the amount without its unit: "0.03" is meaningless
                    until you know whether that is per piece or per kilo. */}
                <Fact label="Price" value={priceLabel(offer)} />
                <Fact
                  label="MOQ"
                  value={
                    offer?.moq ? `${offer.moq} ${offer.moq_unit ?? ""}`.trim() : null
                  }
                />
                <Fact label="Incoterm" value={offer?.incoterm ?? null} />
                <Fact label="Sterile" value={offer ? (offer.is_sterile ? "Yes" : "No") : null} />
                <Fact
                  label="Remarks"
                  value={offer?.remarks ?? null}
                  className="sm:col-span-2"
                />
              </dl>

              {offer && offer.compendia.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {offer.compendia.map((entry) => (
                    <span
                      key={entry.compendium.id}
                      className="rounded-md bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success ring-1 ring-inset ring-success/20"
                      title={entry.compendium.name}
                    >
                      {entry.compendium.code}
                      {entry.edition ? ` ${entry.edition}` : ""}
                    </span>
                  ))}
                </div>
              )}

              {row.standards.length > 0 && (
                <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold">Mentioned in the text:</span>
                  {row.standards.map((token) => (
                    <span
                      key={token}
                      className="rounded bg-secondary px-1.5 py-0.5 font-bold text-muted-foreground"
                    >
                      {token}
                    </span>
                  ))}
                </p>
              )}
            </>
          )}
        </Section>

        {/* --- Company ----------------------------------------------------- */}
        <Section icon={Building2} title="Company">
          <div className="space-y-1">
            <p className="break-words text-sm font-bold text-foreground">
              {supplier.company_name}
            </p>
            {supplier.company_name_cn && (
              <p className="break-words text-xs font-medium text-muted-foreground">
                {supplier.company_name_cn}
              </p>
            )}
            {(supplier.city || supplier.country) && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                {flag ? (
                  <span aria-hidden>{flag}</span>
                ) : (
                  <MapPin className="size-3.5" strokeWidth={2} />
                )}
                {[supplier.city, supplier.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {companyLoading ? (
            <Pending />
          ) : company ? (
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <Fact label="Company type" value={humanise(company.company_type)} />
              <Fact label="Status" value={humanise(company.status)} />
              <Fact label="Address" value={company.address} className="sm:col-span-2" />
              <Fact label="Notes" value={company.notes} className="sm:col-span-2" />
              {company.website && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80">
                    Website
                  </dt>
                  <dd className="mt-0.5">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all text-xs font-medium text-primary hover:underline"
                    >
                      {company.website}
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          ) : null}
        </Section>

        {/* --- Contacts ---------------------------------------------------- */}
        <Section icon={User} title="Contacts">
          {companyLoading ? (
            <Pending />
          ) : company && company.contacts.length > 0 ? (
            <ul className="space-y-3">
              {company.contacts.map((contact) => (
                <ContactBlock key={contact.id} contact={contact} />
              ))}
            </ul>
          ) : supplier.fallback_email ? (
            <p className="text-xs font-medium text-muted-foreground">
              No named contact — general address{" "}
              <a
                href={`mailto:${supplier.fallback_email}`}
                className="font-semibold text-primary hover:underline"
              >
                {supplier.fallback_email}
              </a>
            </p>
          ) : (
            <p className="text-xs font-medium italic text-muted-foreground/70">
              No contact on file.
            </p>
          )}
        </Section>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-secondary/20 px-5 py-3">
        <Link
          href={`/companies/${supplier.company_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Open the full company page
          <ExternalLink className="size-3.5" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ContactBlock({ contact }: { contact: CompanyContact }) {
  return (
    <li className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold text-foreground">{contact.name_en}</p>
        {contact.is_primary && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            Primary
          </span>
        )}
      </div>
      {(contact.designation || contact.department) && (
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
          {[contact.designation, contact.department].filter(Boolean).join(" · ")}
        </p>
      )}

      {contact.channels.length > 0 && (
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {contact.channels.map((channel) => {
            const { Icon, label, tint } = CHANNEL_META[channel.channel];
            const href = hrefForChannel(channel.channel, channel.value);
            return (
              <li
                key={`${channel.channel}-${channel.value}`}
                className="flex min-w-0 items-center gap-1.5"
              >
                <Icon className={cn("size-3.5 shrink-0", tint)} />
                <span className="sr-only">{label}: </span>
                {href ? (
                  <a
                    href={href}
                    {...(channel.channel === "whatsapp" || channel.channel === "linkedin"
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    title={`${label} — ${channel.value}`}
                    className="min-w-0 break-all text-[11px] font-medium text-foreground/85 hover:text-primary hover:underline"
                  >
                    {channel.value}
                  </a>
                ) : (
                  <span
                    title={`${label} — ${channel.value}`}
                    className="min-w-0 break-all text-[11px] font-medium text-foreground/85"
                  >
                    {channel.value}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FlaskConical;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2.25} />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Same rule as the result card: an absent field is shown as "N/A" rather than
 *  dropped, because "not recorded" and "not asked" look identical otherwise. */
function Fact({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-xs leading-snug",
          value ? "font-medium text-foreground/85" : "italic text-muted-foreground/55",
        )}
      >
        {value || "N/A"}
      </dd>
    </div>
  );
}

function Pending() {
  return (
    <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
      <Loader2 className="size-3.5 animate-spin" />
      Loading…
    </p>
  );
}

/** "packaging_material" → "Packaging material". */
function humanise(value: string | null | undefined): string | null {
  if (!value) return null;
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A price band with its unit and as-of date, or null when none is recorded. */
function priceLabel(offer: { 
  price_min: string | null;
  price_max: string | null;
  currency: string | null;
  price_unit: string | null;
  price_asof: string | null;
} | undefined): string | null {
  if (!offer?.price_min) return null;
  const currency = offer.currency ? `${offer.currency} ` : "";
  const amount = offer.price_max
    ? `${currency}${offer.price_min}–${offer.price_max}`
    : `${currency}${offer.price_min}`;
  const unit = offer.price_unit ? ` ${offer.price_unit}` : "";
  const asof = offer.price_asof ? ` (as of ${offer.price_asof})` : "";
  return `${amount}${unit}${asof}`;
}
