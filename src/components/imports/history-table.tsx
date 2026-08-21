"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Loader2,
  ScanText,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImportBatches } from "@/lib/queries";
import type { ImportBatch, ImportStatus } from "@/types/api";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<ImportStatus, { label: string; className: string }> =
  {
    uploaded: { label: "Uploaded", className: "bg-muted text-muted-foreground" },
    parsed: { label: "Parsed", className: "bg-muted text-muted-foreground" },
    previewed: {
      label: "In preparation",
      className: "bg-muted text-muted-foreground",
    },
    pending_approval: {
      label: "Awaiting approval",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    committed: {
      label: "Committed",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    failed: {
      label: "Failed",
      className: "bg-destructive/10 text-destructive",
    },
    rolled_back: {
      label: "Rolled back",
      className: "bg-muted text-muted-foreground",
    },
  };

/** Every batch ever staged, newest first — the audit trail behind FR-IMP. */
export function ImportHistoryTable() {
  const [page, setPage] = useState(1);
  const batches = useImportBatches({ page, size: PAGE_SIZE });

  if (batches.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading history…
      </div>
    );
  }

  const items = batches.data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-16 text-center">
        <Table2 className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">
          Nothing imported yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a spreadsheet or a leaflet photo to get started.
        </p>
        <Link href="/imports" className="mt-4 inline-block">
          <Button variant="secondary">Go to import</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Batch</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Rows</th>
              <th className="px-3 py-2 text-right font-medium">Created</th>
              <th className="px-3 py-2 text-left font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((batch) => (
              <tr key={batch.id} className="hover:bg-accent/40">
                <td className="px-3 py-2">
                  <Link
                    href={`/imports/${batch.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    #{batch.id} {batch.filename}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <SourceLabel batch={batch} />
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[batch.status].className
                    }`}
                  >
                    {STATUS_STYLES[batch.status].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {(batch.total_rows ?? 0).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {batch.status === "committed"
                    ? `${batch.companies_created ?? 0}c / ${
                        batch.products_created ?? 0
                      }p / ${batch.offers_created ?? 0}o`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(batch.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {batches.data && batches.data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {batches.data.page} of {batches.data.pages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= batches.data.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceLabel({ batch }: { batch: ImportBatch }) {
  const isPhoto = batch.source === "leaflet_ocr";
  const Icon = isPhoto ? ScanText : FileSpreadsheet;
  const label = isPhoto
    ? "Leaflet photo"
    : batch.source === "excel"
      ? "Excel"
      : "CSV";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
