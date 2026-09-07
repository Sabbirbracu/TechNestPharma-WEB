"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  FileText,
  Loader2,
  Mail,
  Plus,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ResultsPagination } from "@/components/search/results-pagination";
import { FilePreview } from "@/components/documents/file-preview";
import {
  documentPreviewUrl,
  useCompanies,
  useDeleteDocument,
  useDocuments,
  useDocumentStats,
  useProducts,
  useUpdateDocument,
} from "@/lib/queries";
import type { DocumentItem, DocumentListParams } from "@/types/api";
import {
  docTypeMeta,
  docTypesInFamily,
  formatBytes,
  type DocFamily,
} from "./doc-taxonomy";
import {
  DocumentFilterBar,
  EMPTY_FILTERS,
  type DocumentTab,
  type FilterValues,
} from "./document-filter-bar";
import { DocumentStatCards } from "./document-stat-cards";
import { DocumentUpload } from "./document-upload";
import { DocumentsTable } from "./documents-table";

/**
 * The document library (FR-DOC).
 *
 * The tab strip and the dropdowns are two ways into the same query rather than
 * two query paths: a tab sets the filters it stands for, so "Email Attachments"
 * and picking Email from the Source dropdown produce identical requests and the
 * page cannot reach a state where the two disagree.
 */

const PAGE_SIZE = 10;

export function DocumentsContent() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [tab, setTab] = useState<DocumentTab>("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<number>(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<DocumentItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [renaming, setRenaming] = useState<DocumentItem | null>(null);

  const stats = useDocumentStats();
  const remove = useDeleteDocument();

  // Option lists for the two pickers. Filed against a supplier or a product is
  // the common filing; the other five targets are reached from their own pages.
  const suppliers = useCompanies({ size: 100, sort: "name_en", order: "asc" });
  const products = useProducts({ size: 100, sort: "name_en", order: "asc" });

  const params = useMemo<DocumentListParams>(() => {
    const base: DocumentListParams = { page, size };
    if (search) base.q = search;

    // A tab is a preset over the same filters. Applied first so an explicit
    // dropdown choice can still narrow within the tab.
    if (tab === "email") base.source = ["email"];
    if (tab === "tender") base.source = ["tender"];
    if (tab === "images") base.images_only = true;
    if (tab === "regulatory") base.doc_type = docTypesInFamily("regulatory");
    if (tab === "commercial") base.doc_type = docTypesInFamily("commercial");
    if (tab === "recent") base.added_from = daysAgo(30);

    if (filters.docType) base.doc_type = [filters.docType];
    if (filters.source) base.source = [filters.source];
    if (filters.companyId) base.company_id = Number(filters.companyId);
    if (filters.productId) base.product_id = Number(filters.productId);
    if (filters.dateRange) {
      base.added_from =
        filters.dateRange === "year"
          ? `${new Date().getUTCFullYear()}-01-01`
          : daysAgo(
              filters.dateRange === "7d"
                ? 7
                : filters.dateRange === "30d"
                  ? 30
                  : 90,
            );
    }
    return base;
  }, [page, size, search, tab, filters]);

  const query = useDocuments(params);
  const documents = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = query.data?.pages ?? 1;

  const dirty =
    Boolean(search) ||
    tab !== "all" ||
    filters.docType !== "" ||
    filters.companyId !== "" ||
    filters.productId !== "" ||
    filters.source !== "" ||
    filters.dateRange !== "";

  const sourceCount = (name: string) =>
    stats.data?.by_source.find((row) => row.source === name)?.count;

  const familyCount = (family: DocFamily) => {
    if (!stats.data) return undefined;
    const inFamily = new Set<string>(docTypesInFamily(family));
    return stats.data.by_type
      .filter((row) => inFamily.has(row.doc_type))
      .reduce((running, row) => running + row.count, 0);
  };

  const tabs = [
    { value: "all" as const, label: "All Documents", count: stats.data?.total },
    {
      value: "recent" as const,
      label: "Recent",
      count: stats.data?.added_this_month,
    },
    {
      value: "email" as const,
      label: "Email Attachments",
      count: sourceCount("email"),
    },
    {
      value: "tender" as const,
      label: "Tender Documents",
      count: sourceCount("tender"),
    },
    {
      value: "regulatory" as const,
      label: "Regulatory",
      count: familyCount("regulatory"),
    },
    {
      value: "commercial" as const,
      label: "Commercial",
      count: familyCount("commercial"),
    },
    { value: "images" as const, label: "Images", count: stats.data?.images },
  ];

  function reset() {
    setSearchDraft("");
    setSearch("");
    setFilters(EMPTY_FILTERS);
    setTab("all");
    setPage(1);
    setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      {/* The header lives here rather than in the server page so "Add Document"
          can open the upload panel below it — the button and the panel are one
          interaction, and splitting them across the boundary would mean routing
          a click through the URL. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/12 dark:text-blue-300">
            <FileText className="size-6" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-foreground">
              Documents &amp; Files
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
              Centralized repository for supplier, product, tender and business
              documents.
            </p>
          </div>
        </div>
        <AddDocumentButton onUpload={() => setUploading(true)} />
      </div>

      <DocumentStatCards stats={stats.data} isPending={stats.isPending} />

      {uploading && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Add documents</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploading(false)}
              aria-label="Close upload"
            >
              <X className="size-4" />
            </Button>
          </div>
          <DocumentUpload onClose={() => setUploading(false)} />
        </div>
      )}

      <DocumentFilterBar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        onSearchCommit={() => {
          setSearch(searchDraft.trim());
          setPage(1);
        }}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        onReset={reset}
        dirty={dirty}
        suppliers={(suppliers.data?.items ?? []).map((item) => ({
          id: item.id,
          name: item.name_en,
        }))}
        products={(products.data?.items ?? []).map((item) => ({
          id: item.id,
          name: item.name_en,
        }))}
        tabs={tabs}
        activeTab={tab}
        onTabChange={(next) => {
          setTab(next);
          setPage(1);
          setSelected(new Set());
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <DocumentsTable
          documents={documents}
          isPending={query.isPending}
          error={Boolean(query.error)}
          selected={selected}
          onSelectedChange={setSelected}
          onPreview={setPreview}
          onRename={setRenaming}
          onDelete={setPendingDelete}
          onUpload={() => setUploading(true)}
          filtered={dirty}
        />

        {documents.length > 0 && (
          <div className="border-t border-border/60 px-4 py-3">
            <ResultsPagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={size}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setSize(next);
                setPage(1);
              }}
              itemLabel="documents"
            />
          </div>
        )}
      </div>

      {preview && (
        <PreviewPane document={preview} onClose={() => setPreview(null)} />
      )}

      {renaming && (
        <RenameDialog
          document={renaming}
          onClose={() => setRenaming(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this document?"
          description={
            <>
              <strong>{pendingDelete.title}</strong> will be taken out of the
              library along with everything it is filed against. The file itself
              is kept, so it can be uploaded again.
            </>
          }
          confirmLabel="Remove"
          busy={remove.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={async () => {
            try {
              await remove.mutateAsync(pendingDelete.id);
              toast.success("Document removed.");
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Could not remove it.",
              );
            }
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

/** The header's split action: upload here, or go and save one from the inbox. */
function AddDocumentButton({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex items-stretch">
      <Button onClick={onUpload} className="rounded-r-none">
        <Plus />
        Add Document
      </Button>
      <DropdownMenu
        trigger={(props) => (
          <button
            type="button"
            {...props}
            aria-label="More ways to add a document"
            className="flex items-center rounded-r-xl border-l border-primary-foreground/20 bg-primary px-2 text-primary-foreground shadow-md transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronDown className="size-4" strokeWidth={2.5} />
          </button>
        )}
      >
        {(close) => (
          <>
            <DropdownMenuItem
              onClick={() => {
                onUpload();
                close();
              }}
            >
              <Upload />
              Upload files
            </DropdownMenuItem>
            <Link
              href="/inbox"
              role="menuitem"
              onClick={close}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/70 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
            >
              <Mail />
              Save from email
            </Link>
          </>
        )}
      </DropdownMenu>
    </div>
  );
}

/** Rename in place. The bytes are the identity, so the title is only a label —
 *  renaming is a correction, not a new document, and must not re-upload. */
function RenameDialog({
  document: item,
  onClose,
}: {
  document: DocumentItem;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const update = useUpdateDocument();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rename document"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-bold text-foreground">Rename document</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <label className="block space-y-1.5" htmlFor="rename-title">
            <span className="text-xs font-semibold text-muted-foreground">
              Title
            </span>
            <Input
              id="rename-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5" htmlFor="rename-notes">
            <span className="text-xs font-semibold text-muted-foreground">
              Notes
            </span>
            <textarea
              id="rename-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all hover:border-ring/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3.5">
          <Button variant="outline" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            disabled={update.isPending || !title.trim()}
            onClick={async () => {
              try {
                await update.mutateAsync({
                  id: item.id,
                  title: title.trim(),
                  notes: notes.trim() || undefined,
                });
                toast.success("Renamed.");
                onClose();
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not rename it.",
                );
              }
            }}
          >
            {update.isPending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

function daysAgo(days: number): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() - days);
  return day.toISOString().slice(0, 10);
}

/**
 * Inline preview (FR-DOC-07).
 *
 * The viewer itself is shared with mail attachments (`FilePreview`); this only
 * supplies what the library knows about the file. The subtitle says when a
 * stored rendition differs from what was uploaded, rather than leaving the
 * row's size silently disagreeing with the file the uploader remembers sending.
 */
function PreviewPane({
  document: item,
  onClose,
}: {
  document: DocumentItem;
  onClose: () => void;
}) {
  return (
    <FilePreview
      title={item.title}
      subtitle={
        <>
          {docTypeMeta(item.doc_type).label} · {formatBytes(item.size_bytes)}
          {item.original_size_bytes !== null && (
            <> · optimised from {formatBytes(item.original_size_bytes)}</>
          )}
        </>
      }
      cacheKey={`${item.id}:${item.updated_at}`}
      load={() => documentPreviewUrl(item.id, item.updated_at)}
      onClose={onClose}
    />
  );
}
