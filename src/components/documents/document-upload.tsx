"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadDocument } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { formatBytes } from "./doc-taxonomy";
import {
  DocumentMetadataFields,
  EMPTY_METADATA,
  type DocumentMetadata,
} from "./document-metadata-fields";

/** One file's journey through the upload. Kept per file rather than as a single
 *  batch state so a rejected .doc in the middle of eight certificates reports
 *  itself without taking the other seven down. */
type Upload = {
  key: string;
  file: File;
  status: "pending" | "uploading" | "done" | "duplicate" | "failed";
  error?: string;
};

// HEIC/TIFF/BMP are on the list because the server now re-encodes every image
// to WebP on ingest, so an iPhone photo — the most likely thing a rep uploads
// from the field — is stored as something every browser can render. Kept as
// extensions rather than media types: Safari reports HEIC inconsistently, and
// the server sniffs the bytes anyway, so this only steers the file picker.
const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.tif,.tiff,.bmp,.docx,.xlsx";

/**
 * Drag-and-drop upload with metadata (FR-DOC-08).
 *
 * The metadata is chosen once for the whole drop rather than per file: a person
 * dragging in six certificates is dragging in six of the *same* kind, about the
 * same supplier. Asking thirty-six ways for each would make the common case the
 * slow one, and anything mixed can be retyped from the table afterwards — one
 * dropdown per row.
 *
 * Files are only sent once the metadata is set, so a drop does not race ahead
 * of the decision about what it is.
 */
export function DocumentUpload({
  onClose,
  fixedMetadata,
}: {
  onClose: () => void;
  /** Pre-filled and locked when the caller already knows the context — the
   *  supplier page uploading against itself, for instance. */
  fixedMetadata?: Partial<DocumentMetadata>;
}) {
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    ...EMPTY_METADATA,
    docType: "coa",
    target: "company",
    ...fixedMetadata,
  });
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();

  const busy = uploads.some((item) => item.status === "uploading");

  function accept(files: FileList | null) {
    if (!files?.length) return;
    const added: Upload[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      status: "pending",
    }));
    setUploads((current) => [...current, ...added]);
    void send(added);
  }

  async function send(items: Upload[]) {
    for (const item of items) {
      setUploads((current) =>
        current.map((row) =>
          row.key === item.key ? { ...row, status: "uploading" } : row,
        ),
      );
      try {
        const result = await upload.mutateAsync({
          file: item.file,
          docType: metadata.docType,
          title: item.file.name,
          notes: metadata.notes || undefined,
          target: metadata.targetId
            ? (metadata.target as Exclude<DocumentMetadata["target"], "">)
            : undefined,
          targetId: metadata.targetId ? Number(metadata.targetId) : undefined,
        });
        setUploads((current) =>
          current.map((row) =>
            row.key === item.key
              ? {
                  ...row,
                  status: result.duplicate_of_existing ? "duplicate" : "done",
                }
              : row,
          ),
        );
      } catch (error) {
        setUploads((current) =>
          current.map((row) =>
            row.key === item.key
              ? {
                  ...row,
                  status: "failed",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : row,
          ),
        );
      }
    }
  }

  return (
    <div className="space-y-4">
      <DocumentMetadataFields
        value={metadata}
        onChange={setMetadata}
        idPrefix="upload"
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-secondary/40",
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload className="size-5" strokeWidth={2.25} />
        </span>
        <p className="text-sm font-semibold text-foreground">
          Drop files here, or
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="ml-1 text-primary underline underline-offset-2 hover:opacity-80"
          >
            browse
          </button>
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          PDF, DOCX, XLSX or images (JPEG, PNG, WebP, HEIC) · up to 50 MB each ·
          images are optimised on upload
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            accept(event.target.files);
            // Reset so re-picking the same file fires change again.
            event.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="space-y-1.5">
          {uploads.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3 py-2"
            >
              <StatusIcon status={item.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-foreground">
                  {item.file.name}
                </span>
                <span className="block text-[11px] font-medium text-muted-foreground">
                  {item.status === "failed"
                    ? item.error
                    : item.status === "duplicate"
                      ? "Already in the library — not stored twice"
                      : formatBytes(item.file.size)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          {uploads.some((item) => item.status === "done") ? "Done" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Upload["status"] }) {
  if (status === "uploading" || status === "pending") {
    return (
      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
    );
  }
  if (status === "failed") {
    return <AlertCircle className="size-4 shrink-0 text-destructive" />;
  }
  if (status === "duplicate") {
    return <X className="size-4 shrink-0 text-muted-foreground" />;
  }
  return <CheckCircle2 className="size-4 shrink-0 text-tile-green" />;
}
