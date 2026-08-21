"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Check,
  Copy,
  FlaskConical,
  Link2,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { CHANNEL_META, hrefForChannel } from "@/components/contact-channel";
import {
  ShortlistChip,
  ShortlistMenu,
} from "@/components/tenders/shortlist-menu";
import { ResultDetailsDialog } from "@/components/search/result-details-dialog";
import {
  MATERIAL_TYPE_LABEL,
  flagFor,
  type ResultRow,
} from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type {
  SearchChannel,
  SearchContact,
  ShortlistMembership,
} from "@/types/api";

/**
 * One search result: a product as offered by one supplier, laid out as five
 * columns that answer the buyer's five questions left to right — what is it,
 * how is it specified, who makes it, how do I reach them, what can I do next.
 * Everything on the card is on the card: no drill-down to get a phone number.
 */
export function ResultCard({
  row,
  memberships = [],
}: {
  row: ResultRow;
  /** Tenders this row is already shortlisted onto (FR-TENDER-02). */
  memberships?: ShortlistMembership[];
}) {
  const { product, supplier } = row;
  const category = supplier.material_type;
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <article className="group grid gap-5 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-lg lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.72fr)_minmax(0,1.15fr)_auto] lg:items-start lg:gap-0">
      {/* 1. Identity — the glyph rides inside this column rather than taking a
          column of its own, so the divider falls between facts, not beside art. */}
      <div className="flex min-w-0 items-start gap-3 lg:pr-4">
        <ProductGlyph productId={product.id} />
        <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="min-w-0 break-words text-[15px] font-bold leading-normal tracking-tight text-foreground">
            {product.name_en}
          </h3>
          {category && (
            <span className="inline-flex shrink-0 items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary ring-1 ring-inset ring-primary/20">
              {MATERIAL_TYPE_LABEL[category]}
            </span>
          )}
        </div>

        {(product.name_cn || product.variant) && (
          <p className="mt-1 break-words text-xs font-medium text-muted-foreground">
            {[product.name_cn, product.variant].filter(Boolean).join(" · ")}
          </p>
        )}

        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs font-medium text-foreground/75">
          <span className="shrink-0 whitespace-nowrap text-muted-foreground">CAS No:</span>
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

        {product.indication_text && (
          <p className="mt-1.5 line-clamp-3 break-words text-xs leading-relaxed text-muted-foreground">
            {product.indication_text}
          </p>
        )}
        </div>
      </div>

      {/* 2. Products Specification, Theraputic class, Packaging details*/}
      <dl className="min-w-0 space-y-5 lg:border-l lg:border-border/60 lg:px-4">
        <Fact
          label="Therapeutic Class"
          value={
            product.therapeutic_classes.length > 0
              ? product.therapeutic_classes.join(", ")
              : null
          }
        />
        <Fact label="Specification" value={supplier.specification} />
        <Fact label="Packing Details" value={supplier.packing} />
      </dl>

      {/* 3. Who makes it, and how to reach them — the widest column, because
          it carries the free-text company name plus every contact route. */}
      <div className="min-w-0 lg:border-l lg:border-border/60 lg:px-4">
        <SupplierBlock row={row} />
      </div>

      {/* 4. Next actions, then where this row already sits. The tender chip
          lives under the buttons rather than inside the Shortlist label, so
          the button reads identically on every row. */}
      <div className="grid grid-cols-2 shrink-0 items-center gap-2 lg:flex lg:w-[116px] lg:flex-col lg:items-stretch lg:gap-1.5 lg:border-l lg:border-border/60 lg:pl-4">
        <ShortlistMenu
          productId={product.id}
          companyId={supplier.company_id}
          offerId={supplier.offer_id}
          productName={product.name_en}
          memberships={memberships}
          className="lg:flex-none"
        />
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "h-8 w-full whitespace-nowrap rounded-sm px-2.5 text-[11px] bg-success/10 text-success ring-1 ring-inset ring-success/20 hover:bg-success/15 lg:flex-none",
          )}
        >
          View Details
        </button>
        <ShortlistChip memberships={memberships} />
      </div>

      <ResultDetailsDialog
        row={row}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </article>
  );
}

/** The tinted flask tile. Its colour is derived from the product id so the
 *  same substance keeps the same colour between searches — decorative, but
 *  consistently so, which makes a repeated product easy to re-spot in a list. */
const GLYPH_TINTS = [
  "bg-success/10 text-success ring-success/15",
  "bg-primary/10 text-primary ring-primary/15",
  "bg-[oklch(0.62_0.16_300_/_0.12)] text-[oklch(0.52_0.18_300)] ring-[oklch(0.62_0.16_300_/_0.18)] dark:text-[oklch(0.75_0.14_300)]",
  "bg-warning/12 text-[oklch(0.55_0.14_60)] ring-warning/20 dark:text-warning",
];

function ProductGlyph({ productId }: { productId: number }) {
  const tint = GLYPH_TINTS[productId % GLYPH_TINTS.length];
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105 lg:size-[46px]",
        tint,
      )}
    >
      <FlaskConical className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/** A labelled fact. Always rendered, "N/A" when the supplier gave none — an
 *  absent spec is information (D:2026-08-11), and a row that silently drops
 *  the field looks identical to one that was never asked. */
function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase leading-tight tracking-wide text-muted-foreground/90 py-1">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 break-words text-xs leading-snug",
          value ? "font-bold uppercase text-foreground/85" : "italic text-muted-foreground/55",
        )}
      >
        {value || "N/A"}
      </dd>
    </div>
  );
}

/**
 * Everything about the supplier, on one left edge. Each line leads with a
 * fixed 24px slot — logo, flag, avatar, channel icon — so the company name,
 * country, contact person, and every phone number start at the same x. A
 * ragged left edge here reads as four unrelated fragments rather than one
 * block about one company.
 */
function SupplierBlock({ row }: { row: ResultRow }) {
  const { supplier } = row;
  const [expanded, setExpanded] = useState(false);

  // A named contact's channels are the real routes in; the departmental
  // address is only used when the company has no named contact at all (D11).
  const channels: SearchChannel[] = supplier.contact?.channels.length
    ? supplier.contact.channels
    : supplier.fallback_email
      ? [{ channel: "email", value: supplier.fallback_email, is_primary: true }]
      : [];

  const primary = channels.slice(0, 2);
  const rest = channels.slice(2);
  const flag = flagFor(supplier.country_code);
  const location = [supplier.city, supplier.country].filter(Boolean).join(", ");

  return (
    <div className="min-w-0 space-y-1">
      {/* Its own layout, not SupplierLine's fixed 24px slot — the avatar
          here is deliberately bigger (at least two text lines tall) to lead
          the block, so it can't be capped by the slot other rows share. */}
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-bold uppercase text-foreground/70 ring-1 ring-inset ring-border/60"
        >
          {supplier.company_name.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/companies/${supplier.company_id}`}
            className="block break-words text-xs font-bold leading-normal text-foreground decoration-primary/40 underline-offset-2 hover:underline"
          >
            {supplier.company_name}
          </Link>
          {supplier.company_name_cn && (
            <p className="break-words text-[11px] font-medium leading-snug text-muted-foreground/80">
              {supplier.company_name_cn}
            </p>
          )}
        </div>
      </div>

      {location && (
        <SupplierLine
          slot={
            flag ? (
              <span aria-hidden className="text-[13px] leading-none">
                {flag}
              </span>
            ) : (
              <MapPin className="size-3.5 text-muted-foreground" strokeWidth={2} />
            )
          }
        >
          <p className="break-words text-xs font-medium leading-snug text-muted-foreground">
            {location}
          </p>
        </SupplierLine>
      )}

      <ContactPerson contact={supplier.contact} />

      {channels.length === 0 ? (
        <SupplierLine slot={<Mail className="size-3.5 text-muted-foreground/60" strokeWidth={2} />}>
          <p className="text-[11px] font-medium italic text-muted-foreground/60">
            No contact on file
          </p>
        </SupplierLine>
      ) : (
        <>
          {primary.map((ch) => (
            <ContactLine key={`${ch.channel}-${ch.value}`} channel={ch} />
          ))}
          {expanded &&
            rest.map((ch) => (
              <ContactLine key={`${ch.channel}-${ch.value}`} channel={ch} />
            ))}
        </>
      )}

      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 rounded-sm bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600 transition-colors hover:bg-blue-100"
        >
          <Link2 className="size-3.5 shrink-0" strokeWidth={2.25} />
          {expanded
            ? "Show fewer contact details"
            : `View ${rest.length} more contact detail${rest.length === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}

/** One row of the supplier column: a fixed 24px leading slot, then content.
 *  The fixed slot is what holds every line to the same left edge. */
function SupplierLine({
  slot,
  children,
  align = "center",
}: {
  slot: React.ReactNode;
  children: React.ReactNode;
  /** "start" pins the icon to the first line instead of centering it against
   *  the whole block — for rows like contact person, where a second line
   *  (designation) would otherwise pull the icon down between the two. */
  align?: "center" | "start";
}) {
  return (
    <div className={cn("flex gap-1.5", align === "start" ? "items-start" : "items-center")}>
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center",
          align === "start" && "mt-0.5",
        )}
      >
        {slot}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Initials for the avatar: first letter of the first two words, so
 *  "Tina Jiang" -> TJ and a single-word "General" -> G. */
function initialsOfName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Who to actually ask at this supplier. Named person when one is on file;
 * otherwise the row still appears, labelled as a general company address —
 * "there is no named contact here" is worth knowing before you write, and a
 * silently missing row would read as an oversight instead.
 */
function ContactPerson({ contact }: { contact: SearchContact | null }) {
  return (
    <SupplierLine
      align="start"
      slot={
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[9px] font-bold uppercase ring-1 ring-inset",
            contact
              ? "bg-blue-50 text-primary ring-primary/20"
              : "bg-secondary text-muted-foreground ring-border/60",
          )}
        >
          {contact ? (
            initialsOfName(contact.name_en)
          ) : (
            <User className="size-3" strokeWidth={2.25} />
          )}
        </span>
      }
    >
      <p
        className={cn(
          "break-words text-[12px] font-semibold leading-snug",
          contact ? "text-foreground" : "italic text-muted-foreground",
        )}
      >
        {contact ? contact.name_en : "General enquiries"}
      </p>
      {contact?.designation && (
        <p className="break-words text-[10px] pt-0.5 font-medium leading-snug text-muted-foreground">
          {contact.designation}
        </p>
      )}
    </SupplierLine>
  );
}

/** One reachable route, with copy-on-hover — a WeChat ID has no protocol to
 *  open, so copying has to work for every channel, not just the linkable ones. */
function ContactLine({ channel }: { channel: SearchChannel }) {
  const [copied, setCopied] = useState(false);
  const { Icon, label, tint } = CHANNEL_META[channel.channel];
  const href = hrefForChannel(channel.channel, channel.value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(channel.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be denied; the value stays visible and selectable.
    }
  }

  return (
    <SupplierLine
      slot={<Icon className={cn("size-3.5", tint)} />}
    >
      <div className="group/line flex items-start gap-1">
        <span className="sr-only">{label}: </span>
        {href ? (
          <a
            href={href}
            {...(channel.channel === "whatsapp" || channel.channel === "linkedin"
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            title={`${label} — ${channel.value}`}
            className="min-w-0 break-all text-[11px] font-semibold leading-snug text-foreground/85 underline-offset-2 hover:text-primary hover:underline"
          >
            {channel.value}
          </a>
        ) : (
          <span
            title={`${label} — ${channel.value}`}
            className="min-w-0 break-all text-[11px] font-semibold leading-snug text-foreground/85"
          >
            {channel.value}
          </span>
        )}
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          title="Copy"
          className="shrink-0 rounded p-0.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/line:opacity-100"
        >
          {copied ? (
            <Check className="size-3 text-success" strokeWidth={3} />
          ) : (
            <Copy className="size-3" strokeWidth={2.25} />
          )}
        </button>
      </div>
    </SupplierLine>
  );
}
