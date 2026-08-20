"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useAnalyseSheet, useImportFields, useStageSheet } from "@/lib/queries";
import type { ImportField, SheetPreview } from "@/types/api";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.xlsm";

/**
 * Channel B (05-architecture C2): upload a sheet, confirm how its columns map
 * onto system fields, and stage every row for preview.
 *
 * Two steps rather than one, because the mapping is the whole point: the
 * consolidated sheet maps itself perfectly, but a supplier's own layout needs
 * a human to say which column is which — and getting that wrong silently loads
 * addresses into the product-name field.
 */
export function SheetUploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { data: fields } = useImportFields();
  const analyse = useAnalyseSheet();
  const stage = useStageSheet();

  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = useCallback(() => {
    setPreview(null);
    setColumnMap({});
    setError(null);
    setDragging(false);
    analyse.reset();
    stage.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation objects are recreated each render
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      reset();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, reset]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const result = await analyse.mutateAsync(file);
      setPreview(result);
      setColumnMap(result.suggested_map);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not read that file. Is the API running?",
      );
    }
  }

  async function handleStage() {
    if (!preview) return;
    setError(null);
    try {
      const batch = await stage.mutateAsync({
        upload_token: preview.upload_token,
        filename: preview.filename,
        column_map: columnMap,
        header_row: preview.header_row,
        sheet_name: preview.sheet_name,
      });
      onClose();
      router.push(`/imports/${batch.id}`);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not stage those rows.",
      );
    }
  }

  /** One field maps to one column, so choosing a column frees whatever held it. */
  function assign(fieldKey: string, columnIndex: number | null) {
    setColumnMap((current) => {
      const next: Record<string, number> = {};
      for (const [key, index] of Object.entries(current)) {
        if (key === fieldKey) continue;
        if (columnIndex !== null && index === columnIndex) continue;
        next[key] = index;
      }
      if (columnIndex !== null) next[fieldKey] = columnIndex;
      return next;
    });
  }

  const mappedCount = Object.keys(columnMap).length;
  const hasCompany = "company" in columnMap;
  const hasProduct = "product" in columnMap;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="sheet-upload-title"
      className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative flex max-h-[85vh] flex-col rounded-2xl">
        <header className="flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="sheet-upload-title"
              className="text-base font-bold text-foreground"
            >
              Import a spreadsheet
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {preview
                ? `${preview.filename} — ${preview.total_rows.toLocaleString()} rows`
                : "CSV or Excel. Nothing is saved until you approve the preview."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          {!preview ? (
            <DropZone
              busy={analyse.isPending}
              dragging={dragging}
              setDragging={setDragging}
              onFile={handleFile}
            />
          ) : (
            <MappingStep
              preview={preview}
              fields={fields ?? []}
              columnMap={columnMap}
              onAssign={assign}
            />
          )}
        </div>

        {preview && (
          <footer className="flex flex-col gap-3 border-t border-border bg-card/95 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {mappedCount} column{mappedCount === 1 ? "" : "s"} mapped
              {!hasCompany && (
                <span className="ml-1 font-medium text-destructive">
                  — Company name is required
                </span>
              )}
              {hasCompany && !hasProduct && (
                <span className="ml-1 font-medium text-amber-600 dark:text-amber-500">
                  — without a product column only suppliers will be imported
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={reset} disabled={stage.isPending}>
                Choose another file
              </Button>
              <Button
                onClick={handleStage}
                disabled={!hasCompany || stage.isPending}
              >
                {stage.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Staging {preview.total_rows.toLocaleString()} rows…
                  </>
                ) : (
                  <>
                    Preview {preview.total_rows.toLocaleString()} rows
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </footer>
        )}
      </div>
    </dialog>
  );
}

function DropZone({
  busy,
  dragging,
  setDragging,
  onFile,
}: {
  busy: boolean;
  dragging: boolean;
  setDragging: (value: boolean) => void;
  onFile: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFile(event.dataTransfer.files?.[0]);
      }}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
        dragging
          ? "border-primary bg-primary/5"
          : "border-border bg-muted/30 hover:border-primary/50"
      }`}
    >
      {busy ? (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Reading the file…</p>
        </>
      ) : (
        <>
          <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Upload className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop a spreadsheet here
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              CSV, TSV, or Excel (.xlsx / .xlsm)
            </p>
          </div>
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
    </div>
  );
}

const GROUP_LABELS: Record<string, string> = {
  company: "Company",
  contact: "Contact",
  product: "Product",
  offer: "Offer details",
};

function MappingStep({
  preview,
  fields,
  columnMap,
  onAssign,
}: {
  preview: SheetPreview;
  fields: ImportField[];
  columnMap: Record<string, number>;
  onAssign: (fieldKey: string, columnIndex: number | null) => void;
}) {
  // The consolidated sheet pads every real column with an empty one; showing
  // 21 blank choices would bury the 22 real ones.
  const selectable = preview.columns.filter((column) => !column.is_empty);
  const hiddenSpacers = preview.columns.length - selectable.length;

  const groups = Array.from(new Set(fields.map((field) => field.group)));

  return (
    <div className="space-y-5">
      {preview.duplicate_of !== null && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            These exact bytes were already uploaded as batch #
            {preview.duplicate_of}. Continue only if you meant to import it
            again.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Header found on row{" "}
          <span className="font-medium text-foreground">
            {preview.header_row + 1}
          </span>
        </span>
        <span>
          <span className="font-medium text-foreground">
            {selectable.length}
          </span>{" "}
          columns
        </span>
        {hiddenSpacers > 0 && <span>{hiddenSpacers} empty spacers hidden</span>}
      </div>

      {groups.map((group) => (
        <section key={group}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS[group] ?? group}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields
              .filter((field) => field.group === group)
              .map((field) => {
                const selected = columnMap[field.key];
                const column =
                  selected === undefined
                    ? undefined
                    : preview.columns[selected];
                return (
                  <label
                    key={field.key}
                    className="rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      {field.label}
                      {field.required && (
                        <span className="text-destructive">*</span>
                      )}
                      {selected !== undefined && (
                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-500" />
                      )}
                    </span>
                    <select
                      value={selected ?? ""}
                      onChange={(event) =>
                        onAssign(
                          field.key,
                          event.target.value === ""
                            ? null
                            : Number(event.target.value),
                        )
                      }
                      className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                    >
                      <option value="">— not imported —</option>
                      {selectable.map((option) => (
                        <option key={option.index} value={option.index}>
                          {option.header || `Column ${option.index + 1}`}
                        </option>
                      ))}
                    </select>
                    {column && column.samples.length > 0 && (
                      <p
                        className="mt-1 truncate text-[11px] text-muted-foreground"
                        title={column.samples.join(" · ")}
                      >
                        e.g. {column.samples[0]}
                      </p>
                    )}
                  </label>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
