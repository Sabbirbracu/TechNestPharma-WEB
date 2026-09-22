"use client";

import { useState } from "react";
import {
  AlertCircle,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  ExternalLink,
  Mail,
  MoreVertical,
  Pencil,
  Package,
  Target,
  Trash2,
  Unlink,
  Upload,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { downloadDocument, useUnlinkDocument } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { DocumentItem, DocumentLink } from "@/types/api";
import {
  avatarTint,
  docTypeMeta,
  formatBytes,
  initials,
  SOURCE_CHIP,
  SOURCE_LABELS,
  TARGET_LABELS,
  typeChip,
} from "./doc-taxonomy";

/**
 * The library table.
 *
 * Each row answers "what is this, what is it about, and how did it get here" in
 * that order, because that is the order the questions get asked. `Related To`
 * shows the document's first two filings — a COA is filed against an offer and
 * the sample it arrived with, and both belong on the row — with the rest folded
 * into a count rather than wrapping the row to three lines.
 */

export function DocumentsTable({
  documents,
  isPending,
  error,
  selected,
  onSelectedChange,
  onPreview,
  onRename,
  onDelete,
  onUpload,
  filtered,
}: {
  documents: DocumentItem[];
  isPending: boolean;
  error: boolean;
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
  onPreview: (document: DocumentItem) => void;
  onRename: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
  onUpload: () => void;
  filtered: boolean;
}) {
  const allSelected =
    documents.length > 0 && documents.every((row) => selected.has(row.id));

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading the library…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 p-16 text-sm font-medium text-destructive">
        <AlertCircle className="size-4" />
        The library could not be loaded.
      </div>
    );
  }

  if (documents.length === 0) {
    return <EmptyLibrary filtered={filtered} onUpload={onUpload} />;
  }

  return (
    <>
      {/* Below lg nine columns can't fit: each document becomes a card with
          the same fields, most important first. */}
      <ul className="divide-y divide-border/50 lg:hidden">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            onPreview={() => onPreview(document)}
            onRename={() => onRename(document)}
            onDelete={() => onDelete(document)}
          />
        ))}
      </ul>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[1080px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-secondary/50 text-left">
            <th className="w-10 px-4 py-3">
              <Checkbox
                checked={allSelected}
                indeterminate={
                  !allSelected && documents.some((row) => selected.has(row.id))
                }
                aria-label="Select all on this page"
                onChange={(event) =>
                  onSelectedChange(
                    event.target.checked
                      ? new Set(documents.map((row) => row.id))
                      : new Set(),
                  )
                }
              />
            </th>
            <Th>Document</Th>
            <Th>Type</Th>
            <Th>Related To</Th>
            <Th>Source</Th>
            <Th>Size</Th>
            <Th>Date Added</Th>
            <Th>Added By</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <Row
              key={document.id}
              document={document}
              selected={selected.has(document.id)}
              onSelect={(next) => {
                const copy = new Set(selected);
                if (next) copy.add(document.id);
                else copy.delete(document.id);
                onSelectedChange(copy);
              }}
              onPreview={() => onPreview(document)}
              onRename={() => onRename(document)}
              onDelete={() => onDelete(document)}
            />
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[11px] font-bold tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Row({
  document,
  selected,
  onSelect,
  onPreview,
  onRename,
  onDelete,
}: {
  document: DocumentItem;
  selected: boolean;
  onSelect: (next: boolean) => void;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const meta = docTypeMeta(document.doc_type);
  const added = formatAdded(document.created_at);

  return (
    <tr
      className={cn(
        "border-b border-border/40 transition-colors last:border-0 hover:bg-accent/30",
        selected && "bg-blue-50/60 dark:bg-blue-500/[0.06]",
      )}
    >
      <td className="px-4 py-3.5 align-middle">
        <Checkbox
          checked={selected}
          aria-label={`Select ${document.title}`}
          onChange={(event) => onSelect(event.target.checked)}
        />
      </td>

      <td className="max-w-[300px] px-4 py-3.5 align-middle">
        <span className="flex items-center gap-3">
          <FileGlyph mimeType={document.mime_type} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-foreground">
              {document.title}
            </span>
            <span className="block truncate text-[11px] font-medium text-muted-foreground">
              {meta.fullName}
            </span>
          </span>
        </span>
      </td>

      <td className="px-4 py-3.5 align-middle">
        <TypeChip docType={document.doc_type} />
      </td>

      <td className="max-w-[220px] px-4 py-3.5 align-middle">
        <RelatedTo links={document.links} />
      </td>

      <td className="px-4 py-3.5 align-middle">
        <SourceChip source={document.source} />
      </td>

      <td className="px-4 py-3.5 align-middle text-[13px] font-medium tabular-nums whitespace-nowrap text-muted-foreground">
        {formatBytes(document.size_bytes)}
      </td>

      <td className="px-4 py-3.5 align-middle whitespace-nowrap">
        <span className="block text-[13px] font-medium text-foreground">
          {added.date}
        </span>
        <span className="block text-[11px] font-medium text-muted-foreground">
          {added.time}
        </span>
      </td>

      <td className="px-4 py-3.5 align-middle">
        {document.uploaded_by ? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                avatarTint(document.uploaded_by),
              )}
            >
              {initials(document.uploaded_by)}
            </span>
            <span className="text-[13px] font-medium whitespace-nowrap text-foreground">
              {document.uploaded_by}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-500 text-[11px] font-bold text-white"
            >
              S
            </span>
            <span className="text-[13px] font-medium text-foreground">
              System
            </span>
          </span>
        )}
      </td>

      <td className="px-4 py-3.5 align-middle">
        <span className="flex items-center gap-0.5">
          <RowActions
            document={document}
            onPreview={onPreview}
            onRename={onRename}
            onDelete={onDelete}
          />
        </span>
      </td>
    </tr>
  );
}

/** Preview, download, and the overflow menu — shared by the table row and the
 *  mobile card. */
function RowActions({
  document,
  onPreview,
  onRename,
  onDelete,
}: {
  document: DocumentItem;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const unlink = useUnlinkDocument();
  const [downloading, setDownloading] = useState(false);
  const previewable =
    document.mime_type.startsWith("image/") ||
    document.mime_type === "application/pdf";

  return (
    <>
          <IconButton
            label={`Preview ${document.title}`}
            onClick={onPreview}
            disabled={!previewable}
          >
            <Eye className="size-[18px]" strokeWidth={2} />
          </IconButton>
          <IconButton
            label={`Download ${document.title}`}
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              try {
                await downloadDocument(document.id, document.title);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not download it.",
                );
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <Download className="size-[18px]" strokeWidth={2} />
            )}
          </IconButton>
          <DropdownMenu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label={`More actions for ${document.title}`}
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <MoreVertical className="size-[18px]" strokeWidth={2} />
              </button>
            )}
          >
            {(close) => (
              <>
                {/* Open Related is the two-way half of the relationship: from
                    a COA you can reach the product, and from the product you
                    can reach the COA. Without it the table is a dead end. */}
                {document.links.map((link) => (
                  <Link
                    key={`open-${link.id}`}
                    href={link.href}
                    role="menuitem"
                    onClick={close}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/70 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
                  >
                    <ExternalLink />
                    Open {link.label}
                  </Link>
                ))}
                <DropdownMenuItem
                  onClick={() => {
                    onRename();
                    close();
                  }}
                >
                  <Pencil />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {document.links.map((link) => (
                  <DropdownMenuItem
                    key={link.id}
                    onClick={() => {
                      unlink.mutate({ id: document.id, linkId: link.id });
                      close();
                    }}
                  >
                    <Unlink />
                    Unfile from {link.label}
                  </DropdownMenuItem>
                ))}
                {document.links.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  destructive
                  onClick={() => {
                    onDelete();
                    close();
                  }}
                >
                  <Trash2 />
                  Remove from library
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenu>
    </>
  );
}

function formatAdded(iso: string): { date: string; time: string } {
  const added = new Date(iso);
  return {
    date: added.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: added.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function TypeChip({ docType }: { docType: DocumentItem["doc_type"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset",
        typeChip(docType),
      )}
    >
      {docTypeMeta(docType).label}
    </span>
  );
}

function SourceChip({ source }: { source: DocumentItem["source"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset",
        SOURCE_CHIP[source] ?? SOURCE_CHIP.manual,
      )}
    >
      <SourceGlyph source={source} />
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

/** The phone / tablet counterpart of `Row`. */
function DocumentCard({
  document,
  onPreview,
  onRename,
  onDelete,
}: {
  document: DocumentItem;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const meta = docTypeMeta(document.doc_type);
  const added = formatAdded(document.created_at);

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <FileGlyph mimeType={document.mime_type} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm leading-snug font-semibold break-words text-foreground">
            {document.title}
          </p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">
            {meta.fullName}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <TypeChip docType={document.doc_type} />
        <SourceChip source={document.source} />
      </div>

      <div className="mt-2.5 text-xs">
        <RelatedTo links={document.links} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
        <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
          <span className="tabular-nums">{formatBytes(document.size_bytes)}</span>
          {" · "}
          {added.date}
          {" · "}
          {document.uploaded_by ?? "System"}
        </p>
        <span className="-mr-2 flex shrink-0 items-center">
          <RowActions
            document={document}
            onPreview={onPreview}
            onRename={onRename}
            onDelete={onDelete}
          />
        </span>
      </div>
    </li>
  );
}

/** The first two filings, then a count. Two lines is what the row has room for,
 *  and the primary link is the one people click. */
function RelatedTo({ links }: { links: DocumentLink[] }) {
  if (links.length === 0) {
    return (
      <span className="text-[13px] font-medium text-muted-foreground">
        Not filed yet
      </span>
    );
  }

  const [primary, secondary] = links;
  return (
    <span className="block min-w-0">
      <Link
        href={primary.href}
        className="block truncate text-[13px] font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        {primary.label}
      </Link>
      {secondary ? (
        <span className="block truncate text-[11px] font-medium text-muted-foreground">
          {secondary.label}
          {links.length > 2 && ` +${links.length - 2}`}
        </span>
      ) : (
        <span className="block text-[11px] font-medium text-muted-foreground">
          {TARGET_LABELS[primary.target]}
        </span>
      )}
    </span>
  );
}

function FileGlyph({ mimeType }: { mimeType: string }) {
  const image = mimeType.startsWith("image/");
  const sheet = mimeType.includes("spreadsheet");
  const Icon = image ? FileImage : sheet ? FileSpreadsheet : FileText;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg",
        image
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300"
          : sheet
            ? "bg-green-50 text-green-600 dark:bg-green-500/12 dark:text-green-300"
            : "bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-300",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2} />
    </span>
  );
}

function SourceGlyph({ source }: { source: string }) {
  if (source === "email") return <Mail className="size-3.5" strokeWidth={2.5} />;
  if (source === "tender") return <Target className="size-3.5" strokeWidth={2.5} />;
  return <Package className="size-3.5" strokeWidth={2.5} />;
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
    </button>
  );
}

function EmptyLibrary({
  filtered,
  onUpload,
}: {
  filtered: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Inbox className="size-6" />
      </span>
      <p className="text-sm font-bold text-foreground">
        {filtered ? "Nothing matches those filters" : "No documents yet"}
      </p>
      <p className="max-w-md text-xs font-medium text-muted-foreground">
        {filtered
          ? "Try a wider type, a different source, or clear the search."
          : "COAs, certificates, master files and spec sheets live here. Files are checksummed, so the same document is never stored twice, and they are served only through an authenticated endpoint."}
      </p>
      {!filtered && (
        <Button onClick={onUpload} className="mt-1">
          <Upload />
          Add Document
        </Button>
      )}
    </div>
  );
}
