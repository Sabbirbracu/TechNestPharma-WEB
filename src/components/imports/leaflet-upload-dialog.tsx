"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ScanText,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useImportLeaflet, useOcrStatus } from "@/lib/queries";
import type { OcrBatchResult } from "@/types/api";

const ACCEPT = ".jpg,.jpeg,.png,.heic,.heif,.tif,.tiff,.webp,.bmp";

/** Below this the read is poor enough that manual entry is likely faster. */
const POOR_READ = 60;

/**
 * Channel C (05-architecture C3): a leaflet photograph read by OCR into the
 * same preview grid the spreadsheet channel uses.
 *
 * This channel never auto-commits. Tesseract reads these glossy bilingual
 * catalogues at roughly 55–80% confidence, so what comes back is a draft that
 * removes the typing, not the checking — the screen is written to say so
 * rather than to imply the rows are ready.
 */
export function LeafletUploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { data: ocr } = useOcrStatus();
  const importLeaflet = useImportLeaflet();

  const [result, setResult] = useState<OcrBatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setDragging(false);
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
      setResult(await importLeaflet.mutateAsync(file));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not read that photo. Is the API running?",
      );
    }
  }

  const unavailable = ocr && !ocr.available;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="leaflet-upload-title"
      className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-2xl border-0 bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-foreground/60 backdrop:backdrop-blur-md"
    >
      <div className="relative flex max-h-[85vh] flex-col rounded-2xl">
        <header className="flex items-center gap-3 border-b border-border bg-card/95 px-6 py-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScanText className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="leaflet-upload-title"
              className="text-base font-bold text-foreground"
            >
              Read a leaflet photo
            </h2>
            <p className="text-xs text-muted-foreground">
              OCR produces a draft. Every row is checked by you before commit.
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

          {unavailable ? (
            <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{ocr?.detail}</span>
            </p>
          ) : result ? (
            <OcrOutcome result={result} />
          ) : (
            <>
              {ocr && !ocr.chinese_available && ocr.detail && (
                <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{ocr.detail}</span>
                </p>
              )}
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:border-primary/50"
                }`}
              >
                {importLeaflet.isPending ? (
                  <>
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      Reading the page…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      A full page takes a few seconds.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Upload className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Drop a leaflet photo here
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        JPEG, PNG, or HEIC straight off the phone
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => inputRef.current?.click()}
                    >
                      Browse photos
                    </Button>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </>
          )}
        </div>

        {result && (
          <footer className="flex items-center justify-end gap-2 border-t border-border bg-card/95 px-6 py-4">
            <Button variant="ghost" onClick={reset}>
              Read another
            </Button>
            <Button
              onClick={() => {
                onClose();
                router.push(`/imports/${result.batch.id}`);
              }}
            >
              Check {result.summary.total} row
              {result.summary.total === 1 ? "" : "s"}
              <ArrowRight />
            </Button>
          </footer>
        )}
      </div>
    </dialog>
  );
}

function OcrOutcome({ result }: { result: OcrBatchResult }) {
  const poor = result.mean_confidence < POOR_READ || result.summary.total === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Rows read" value={result.summary.total} />
        <Stat
          label="Confidence"
          value={`${Math.round(result.mean_confidence)}%`}
          tone={
            result.mean_confidence >= 75
              ? "good"
              : result.mean_confidence >= POOR_READ
                ? "warn"
                : "bad"
          }
        />
        <Stat
          label="Needs a look"
          value={result.summary.warnings}
          tone={result.summary.warnings > 0 ? "warn" : "good"}
        />
      </div>

      {poor && (
        <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            This page read poorly. The photo has been kept either way, so you
            can correct the rows in the grid — or enter this leaflet by hand and
            discard the batch.
          </span>
        </p>
      )}

      {result.warnings.map((warning) => (
        <p
          key={warning}
          className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          {warning}
        </p>
      ))}

      {result.text && (
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground">
            Everything the OCR read
          </summary>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap px-3 pb-3 text-[11px] leading-relaxed text-muted-foreground">
            {result.text}
          </pre>
        </details>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    neutral: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-500",
    warn: "text-amber-600 dark:text-amber-500",
    bad: "text-destructive",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
