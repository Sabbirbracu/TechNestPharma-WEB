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
import { cn } from "@/lib/utils";
import type { LabelledCount } from "@/types/api";

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

const TILES: DocTile[] = [
  {
    label: "Brochures",
    icon: FileText,
    chip: "bg-tile-green-bg text-tile-green",
    types: ["brochure", "product_catalogue", "leaflet_photo"],
  },
  {
    label: "Certificates",
    icon: Award,
    chip: "bg-tile-blue-bg text-tile-blue",
    types: ["gmp_certificate", "cep_certificate", "dmf_letter"],
  },
  {
    label: "COA",
    icon: FileCheck2,
    chip: "bg-tile-purple-bg text-tile-purple",
    types: ["coa"],
  },
  {
    label: "Spec Sheets",
    icon: ScrollText,
    chip: "bg-tile-amber-bg text-tile-amber",
    types: ["specification", "msds"],
  },
  {
    label: "Other Documents",
    icon: Files,
    chip: "bg-tile-teal-bg text-tile-teal",
    types: ["business_card", "price_list", "audit_report", "other"],
  },
];

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
