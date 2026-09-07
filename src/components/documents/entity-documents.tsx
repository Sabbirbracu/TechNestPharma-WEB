"use client";

import { useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadDocument, useDocuments } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { DocumentListParams, DocumentTarget } from "@/types/api";
import {
  DOC_FAMILIES,
  docTypeMeta,
  docTypesInFamily,
  formatBytes,
  typeChip,
  type DocFamily,
} from "./doc-taxonomy";
import { DocumentUpload } from "./document-upload";

/** Built once at module load rather than per render: `docTypesInFamily` walks
 *  the whole type table, and this panel re-renders on every keystroke in its
 *  search box. */
const DOC_FAMILY_TYPES = Object.fromEntries(
  DOC_FAMILIES.map((family) => [family.value, docTypesInFamily(family.value)]),
) as Record<DocFamily, DocumentListParams["doc_type"]>;

/**
 * "Documents (n)" on a supplier's or a product's own page.
 *
 * The other half of the library's two-way relationship: from a COA you reach
 * the product, and from the product you reach every document filed against it.
 * Without this the library is a place you have to remember to visit; with it,
 * the documents are where the work already is.
 *
 * Deliberately not the full table — no bulk select, no source column, no
 * pagination controls. Someone on a supplier's page is looking for one file,
 * and the full library is one click away when they are not.
 */

const FAMILY_TABS: { value: DocFamily | "all"; label: string }[] = [
  { value: "all", label: "All" },
  ...DOC_FAMILIES.map((family) => ({ value: family.value, label: family.label })),
];

export function EntityDocuments({
  target,
  targetId,
  title = "Documents",
  compact = false,
}: {
  target: Extract<DocumentTarget, "company" | "product">;
  targetId: number;
  title?: string;
  /** Inside a dialog, where the surrounding panel already supplies a heading
   *  and there is no room for the upload form or the family tabs. */
  compact?: boolean;
}) {
  const [family, setFamily] = useState<DocFamily | "all">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  const params: DocumentListParams = {
    size: 50,
    ...(target === "company"
      ? { company_id: targetId }
      : { product_id: targetId }),
    ...(search ? { q: search } : {}),
    ...(family === "all"
      ? {}
      : {
          doc_type: DOC_FAMILY_TYPES[family],
        }),
  };

  const query = useDocuments(params);
  const documents = query.data?.items ?? [];

  return (
    <section className={compact ? "space-y-2" : "space-y-4"}>
      {!compact && (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {title}
              {query.data ? ` (${query.data.total})` : ""}
            </h2>
            <p className="text-xs text-muted-foreground">
              Certificates, specifications and paperwork filed here
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setUploading((open) => !open)}>
          <Plus className="size-4" />
          Add Document
        </Button>
      </div>
      )}

      {!compact && uploading && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <DocumentUpload
            onClose={() => setUploading(false)}
            // The context is already known, so the form opens pointed at this
            // entity instead of asking which one.
            fixedMetadata={{ target, targetId: String(targetId) }}
          />
        </div>
      )}

      {!compact && (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setSearch(draft.trim());
            }}
            placeholder="Search documents…"
            aria-label={`Search ${title.toLowerCase()}`}
            className="h-9 pl-9"
          />
        </div>
        {FAMILY_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFamily(tab.value)}
            aria-pressed={family === tab.value}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              family === tab.value
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/12 dark:text-blue-300"
                : "border-transparent bg-secondary text-muted-foreground hover:bg-accent/70 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      )}

      {query.isPending ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading documents…
        </div>
      ) : query.error ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-destructive">
          <AlertCircle className="size-4" />
          Documents could not be loaded.
        </div>
      ) : documents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center text-sm font-medium text-muted-foreground">
          {search || family !== "all"
            ? "Nothing matches that here."
            : "No documents filed against this yet."}
        </p>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
          {documents.map((document) => {
            const meta = docTypeMeta(document.doc_type);
            return (
              <li
                key={document.id}
                className="flex items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-accent/30"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-300">
                  <FileText className="size-[18px]" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">
                    {document.title}
                  </span>
                  <span className="block truncate text-[11px] font-medium text-muted-foreground">
                    {meta.fullName} · {formatBytes(document.size_bytes)} ·{" "}
                    {new Date(document.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset sm:inline-flex",
                    typeChip(document.doc_type),
                  )}
                >
                  {meta.label}
                </span>
                <button
                  type="button"
                  aria-label={`Download ${document.title}`}
                  onClick={async () => {
                    try {
                      await downloadDocument(document.id, document.title);
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Could not download it.",
                      );
                    }
                  }}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Download className="size-[18px]" strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {query.data && query.data.total > documents.length && (
        <p className="text-xs font-medium text-muted-foreground">
          Showing {documents.length} of {query.data.total}.{" "}
          <Link
            href={`/documents?${target === "company" ? "company" : "product"}=${targetId}`}
            className="font-semibold text-primary hover:underline"
          >
            Open the full library
          </Link>
        </p>
      )}
    </section>
  );
}

