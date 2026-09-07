"use client";

import {
  Ban,
  Building2,
  CircleCheck,
  CircleSlash,
  ExternalLink,
  Globe,
  MapPin,
} from "lucide-react";
import { flagEmoji } from "@/components/products/product-taxonomy";
import { cn } from "@/lib/utils";
import type { CompanyDetail } from "@/types/api";
import type { CompanyStatus, CompanyType } from "@/types/domain";

const TYPE_LABEL: Record<CompanyType, string> = {
  manufacturer: "Manufacturer",
  trader: "Trader",
  manufacturer_trader: "Mfr + Trader",
  agent: "Agent",
};

const STATUS_CHIP: Record<
  CompanyStatus,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  active: {
    label: "Active",
    icon: CircleCheck,
    className: "bg-success/10 text-success ring-success/20",
  },
  inactive: {
    label: "Inactive",
    icon: CircleSlash,
    className: "bg-muted text-muted-foreground ring-border",
  },
  blacklisted: {
    label: "Blacklisted",
    icon: Ban,
    className: "bg-destructive/10 text-destructive ring-destructive/20",
  },
};

/** A company's `website` column is one text field that has held several URLs
 *  since the CSV import — the sheet separated them with commas and semicolons. */
function websites(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;,]\s*/)
    .map((site) => site.trim())
    .filter(Boolean);
}

/**
 * The masthead of a supplier's profile: who they are, whether we are still
 * dealing with them, and where to reach them — above every action, because
 * that is the order the question gets asked in.
 */
export function CompanyBanner({ company }: { company: CompanyDetail }) {
  // The artwork is a desktop-only flourish, and the banner's geometry follows
  // from it. Fitted by height, the 3:1 graphic always renders 600×200 however
  // wide the monitor is — so it never inflates on a 22" screen, and the name
  // block reserves a fixed 300px on the right (the graphic's own left third is
  // empty) rather than a percentage that would collide at 1280px. Below `lg`
  // there is no width for both, so the card is plain and sized by its text.
  const status = STATUS_CHIP[company.status] ?? STATUS_CHIP.inactive;
  const StatusIcon = status.icon;
  const location = [company.city, company.country?.name].filter(Boolean).join(", ");
  const flag = flagEmoji(company.country?.iso2 ?? null);
  const links = websites(company.website);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:flex lg:min-h-[200px] lg:items-center">
      <BannerArtwork />

      <div className="relative flex w-full flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-7 lg:pr-[300px]">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md ring-1 ring-inset ring-white/10">
          <Building2 className="size-8" strokeWidth={1.9} />
        </span>

        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[32px] sm:leading-[1.15]">
            {company.name_en}
          </h1>

          {company.name_cn ? (
            <p className="text-[15px] font-medium text-muted-foreground">
              {company.name_cn}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-0.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset",
                status.className,
              )}
            >
              <StatusIcon className="size-3.5" strokeWidth={2.4} />
              {status.label}
            </span>

            <span className="inline-flex items-center rounded-full bg-tile-blue-bg px-3 py-1 text-[13px] font-semibold text-tile-blue ring-1 ring-inset ring-tile-blue/15">
              {TYPE_LABEL[company.company_type] ?? company.company_type}
            </span>

            {location ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <MapPin className="size-4" strokeWidth={2} />
                {location}
                {flag ? <span aria-hidden className="text-base leading-none">{flag}</span> : null}
              </span>
            ) : null}

            {links.map((site) => (
              <a
                key={site}
                href={site.startsWith("http") ? site : `https://${site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-success transition-colors hover:text-success/80"
              >
                <Globe className="size-4 text-tile-blue" strokeWidth={2} />
                <span className="underline-offset-2 group-hover:underline">
                  {site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
                <ExternalLink className="size-3.5 opacity-70" strokeWidth={2.2} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The banner's background: the brand strip as supplied, not a redrawing of it.
 *
 * `contain` anchored right, not `cover`: cover would fill the card by width and
 * so crop the flask and the leaf tips out of frame — and it would keep growing
 * with the monitor. Fitted by height the whole design is always on screen at
 * one steady size. The graphic's own left edge is 253/255 grey against a white
 * card, so it dissolves into the surface with no masking. Decorative, so it is
 * `aria-hidden` and carries no alt text.
 */
function BannerArtwork() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden rounded-2xl bg-[url('/company-banner.webp')] bg-contain bg-right bg-no-repeat lg:block"
    />
  );
}
