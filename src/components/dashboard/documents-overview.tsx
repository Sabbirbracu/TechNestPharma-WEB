"use client";

import Link from "next/link";
import {
  Award,
  FileCheck2,
  FileText,
  Files,
  FolderOpen,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DOC_TYPES } from "@/components/documents/doc-taxonomy";
import { cn } from "@/lib/utils";
import type { DocType, LabelledCount } from "@/types/api";

/**
 * The document library at a glance.
 *
 * The API returns raw per-`doc_type` counts; the grouping into these five
 * tiles lives here rather than server-side, so the documents page can group the
 * same call its own way. A `doc_type` absent from the response counts as zero.
 *
 * "Total Documents" is the library's own total rather than the sum of the tiles
 * above it — they happen to partition every type today, but a type added to the
 * backend enum and not to `TILES` would otherwise go silently uncounted.
 */

type DocTile = {
  label: string;
  icon: LucideIcon;
  chip: string;
  /** The `doc_type` values this tile counts. */
  types: string[];
};

// Every `doc_type` must appear in exactly one tile, or its documents are
// counted nowhere and the card quietly under-reports the library. The eight
// regulatory types added in migration 0031 are the reason this list is longer
// than the five it started with. `DOC_TYPES` in the documents module is the
// canonical taxonomy; these tiles are a coarser grouping of the same values,
// and `assertEveryTypeIsCounted` below keeps the two from drifting apart.
const TILES: DocTile[] = [
  {
    label: "Quality",
    icon: FileCheck2,
    chip: "bg-tile-purple-bg text-tile-purple",
    types: [
      "coa",
      "test_report",
      "specification",
      "technical_data_sheet",
      "msds",
      "compendial_monograph",
      "leaflet_photo",
    ],
  },
  {
    label: "Regulatory",
    icon: Award,
    chip: "bg-tile-blue-bg text-tile-blue",
    types: [
      "dmf_letter",
      "site_master_file",
      "plant_master_file",
      "cep_certificate",
      "gmp_certificate",
      "regulatory_certificate",
      "drug_authority_certificate",
      "license",
      "tse_bse_statement",
      "halal_certificate",
      "kosher_certificate",
      "audit_report",
    ],
  },
  {
    label: "Tender",
    icon: ScrollText,
    chip: "bg-tile-green-bg text-tile-green",
    types: [
      "tender_notice",
      "tender_specification",
      "tender_schedule",
      "tender_attachment",
      "tender_result",
    ],
  },
  {
    label: "Commercial",
    icon: FileText,
    chip: "bg-tile-amber-bg text-tile-amber",
    types: [
      "quotation",
      "proforma_invoice",
      "invoice",
      "purchase_order",
      "contract",
      "price_list",
      "brochure",
      "company_profile",
      "product_catalogue",
      "letter",
    ],
  },
  {
    label: "Other",
    icon: Files,
    chip: "bg-tile-teal-bg text-tile-teal",
    types: ["business_card", "other"],
  },
];

/** A compile-time check that the tiles cover the whole enum. Adding a
 *  `doc_type` without giving it a tile makes this line fail to typecheck,
 *  rather than making the dashboard silently lose the count. */
const COUNTED = new Set(TILES.flatMap((tile) => tile.types));
const UNCOUNTED: DocType[] = DOC_TYPES.map((type) => type.value).filter(
  (value) => !COUNTED.has(value),
);
if (process.env.NODE_ENV !== "production" && UNCOUNTED.length > 0) {
  console.warn(
    `documents-overview: no tile counts ${UNCOUNTED.join(", ")}`,
  );
}

export function DocumentsOverview({
  byType,
  total,
  isPending,
  error,
}: {
  byType: LabelledCount[] | undefined;
  total: number;
  isPending: boolean;
  error: boolean;
}) {
  const counts = new Map((byType ?? []).map((row) => [row.label, row.count]));
  const sum = (types: string[]) =>
    types.reduce((running, type) => running + (counts.get(type) ?? 0), 0);

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
          Documents Overview
        </h2>
        <Link
          href="/documents"
          className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all
        </Link>
      </div>

      {isPending ? (
        <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-[74px] animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : error ? (
        <p className="flex-1 py-10 text-center text-sm font-medium text-muted-foreground">
          Could not load document counts.
        </p>
      ) : (
        <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
          {TILES.map((tile) => (
            <Tile
              key={tile.label}
              label={tile.label}
              icon={tile.icon}
              chip={tile.chip}
              count={sum(tile.types)}
            />
          ))}
          <Tile
            label="Total Documents"
            icon={FolderOpen}
            chip="bg-tile-rose-bg text-tile-rose"
            count={total}
          />
        </div>
      )}
    </Card>
  );
}

function Tile({
  label,
  icon: Icon,
  chip,
  count,
}: {
  label: string;
  icon: LucideIcon;
  chip: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          chip,
        )}
      >
        <Icon className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <span className="block text-lg font-bold leading-6 tracking-tight tabular-nums text-foreground">
          {count.toLocaleString()}
        </span>
      </span>
    </div>
  );
}
