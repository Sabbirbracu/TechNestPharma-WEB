"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { downloadDocument, useDocuments } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  docTypeMeta,
  formatBytes,
  typeChip,
} from "@/components/documents/doc-taxonomy";
import {
  IconButton,
  OUTLINE_BUTTON,
  SectionCard,
} from "@/components/companies/detail/section-card";
import { DocumentUpload } from "@/components/documents/document-upload";
import type { DocumentItem } from "@/types/api";

/** The card shows the most recent handful — the full library is one click
 *  away, and someone on a supplier's page is looking for one file. */
const RECENT_COUNT = 4;

/** The file-type glyph, taken from the stored mime rather than the filename:
 *  the library re-encodes some uploads, and the extension a user typed is not
 *  what is on disk. */
function fileGlyph(mime: string): { icon: typeof FileText; className: string } {
  if (mime.includes("pdf"))
    return { icon: FileText, className: "bg-destructive/10 text-destructive" };
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return { icon: FileSpreadsheet, className: "bg-success/12 text-success" };
  if (mime.startsWith("image/"))
    return { icon: ImageIcon, className: "bg-tile-purple-bg text-tile-purple" };
  if (mime.includes("word") || mime.includes("document"))
    return { icon: FileText, className: "bg-tile-blue-bg text-tile-blue" };
  return { icon: FileText, className: "bg-muted text-muted-foreground" };
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CompanyDocuments({ companyId }: { companyId: number }) {
  const [uploading, setUploading] = useState(false);
  const { data, isPending, error } = useDocuments({
    company_id: companyId,
    size: RECENT_COUNT,
    sort: "created_at",
    order: "desc",
  });
  const documents = data?.items ?? [];

  return (
    <SectionCard
      icon={FileText}
      title="Recent Documents"
      actions={
        <>
          <Link
            href={`/documents?company=${companyId}`}
            className="text-[13px] font-semibold text-success transition-colors hover:text-success/80"
          >
            View All
          </Link>
          <button
            type="button"
            onClick={() => setUploading((open) => !open)}
            aria-expanded={uploading}
            className={cn(OUTLINE_BUTTON, "h-9 px-3.5 text-[13px]")}
          >
            <Plus strokeWidth={2.4} />
            Add
          </button>
        </>
      }
    >
      {uploading ? (
        <div className="mb-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
          <DocumentUpload
            onClose={() => setUploading(false)}
            // The context is already known, so the form opens pointed at this
            // company instead of asking which one.
            fixedMetadata={{ target: "company", targetId: String(companyId) }}
          />
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-10 text-sm font-semibold text-destructive"
        >
          <AlertCircle className="size-4" />
          Documents could not be loaded.
        </div>
      ) : isPending ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-4 py-10 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading documents…
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No documents filed yet
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            Certificates, brochures and product lists filed against this company
            appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/50">
                  {/* `w-full max-w-0` is what makes the title cell truncate:
                      a table cell only clips once it has a resolved width, and
                      this card is half the page wide. */}
                  <th
                    scope="col"
                    className="w-full max-w-0 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="w-px whitespace-nowrap px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="w-px whitespace-nowrap px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Uploaded On
                  </th>
                  <th scope="col" className="w-px px-3 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {documents.map((file) => (
                  <DocumentRow key={file.id} file={file} companyId={companyId} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function DocumentRow({
  file,
  companyId,
}: {
  file: DocumentItem;
  companyId: number;
}) {
  const router = useRouter();
  const glyph = fileGlyph(file.mime_type);
  const Icon = glyph.icon;
  const meta = docTypeMeta(file.doc_type);

  async function download() {
    try {
      await downloadDocument(file.id, file.title);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not download it.",
      );
    }
  }

  return (
    <tr className="bg-card transition-colors hover:bg-success/[0.04]">
      <td className="w-full max-w-0 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              glyph.className,
            )}
          >
            <Icon className="size-[18px]" strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-foreground">
              {file.title}
            </span>
            <span className="block truncate text-[11px] font-medium text-muted-foreground">
              {formatBytes(file.size_bytes)}
            </span>
          </span>
        </div>
      </td>
      <td className="w-px px-3 py-3">
        <span
          className={cn(
            "inline-flex whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
            typeChip(file.doc_type),
          )}
        >
          {meta.label}
        </span>
      </td>
      <td className="w-px whitespace-nowrap px-3 py-3 text-[13px] font-medium text-muted-foreground">
        {formatDate(file.created_at)}
      </td>
      <td className="w-px px-3 py-3">
        <DropdownMenu
          trigger={(props) => (
            <IconButton aria-label={`Actions for ${file.title}`} {...props}>
              <MoreHorizontal strokeWidth={2.2} />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  void download();
                }}
              >
                <Download />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  router.push(`/documents?company=${companyId}`);
                }}
              >
                <ExternalLink />
                Open in library
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </td>
    </tr>
  );
}
