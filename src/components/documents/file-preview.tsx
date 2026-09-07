"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What may be rendered inline, and why the list is this short.
 *
 * A `blob:` URL inherits the origin of the page that created it, so an HTML or
 * SVG file rendered in an iframe here runs script **on our own origin** — it
 * could read the session and act as the user. That is not theoretical for mail
 * attachments: they arrive from outside and nothing sniffs them on the way in,
 * which is exactly why the download endpoint forces
 * `Content-Disposition: attachment`.
 *
 * PDFs render in the browser's own sandboxed viewer and raster images cannot
 * execute, so those two are safe. Everything else downloads instead. SVG is
 * deliberately absent from `image/*` here — it is a script container wearing an
 * image's media type.
 */
export function isPreviewable(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const type = mime.toLowerCase();
  if (type === "application/pdf") return true;
  return type.startsWith("image/") && !type.includes("svg");
}

/**
 * The shared inline viewer (FR-DOC-07), used by the library and by mail
 * attachments in both thread views.
 *
 * The bytes come through `apiFetch` as a blob rather than an `<iframe src>`
 * pointing at the API: the endpoint is behind the auth check and an iframe
 * sends no Authorization header, so it would render a login redirect. The
 * object URL is revoked when the pane closes — leaving it would pin the file
 * in memory for the life of the tab.
 *
 * Which element renders it is decided by the blob's own type, not by whatever
 * the caller believes the type to be: the library's preview endpoint
 * transcodes images no browser decodes (HEIC, TIFF) to JPEG, so the stored
 * type and the served type differ for exactly those. The `onError` fallback
 * covers the rest — a file that still will not decode says so, instead of
 * leaving a blank frame.
 */
export function FilePreview({
  title,
  subtitle,
  cacheKey,
  load,
  onDownload,
  onClose,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Changes when the file being shown changes. The loader is deliberately not
   *  a dependency — callers pass an inline closure, and depending on it would
   *  refetch on every render. */
  cacheKey: string;
  load: () => Promise<{ url: string; mime: string }>;
  onDownload?: () => void;
  onClose: () => void;
}) {
  // Result and the file it belongs to are one piece of state, so switching
  // files cannot render the previous one's bytes under the new one's title.
  // Anything whose `key` is not the current `cacheKey` reads as "still
  // loading", which is what it is.
  const [result, setResult] = useState<{
    key: string;
    preview?: { url: string; mime: string };
    failed?: boolean;
  }>({ key: "" });

  // The loader is an inline closure at every call site, so it cannot be an
  // effect dependency without refetching on every render. Synced through a ref
  // in its own effect, declared first so it lands before the fetch below reads
  // it.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    loadRef
      .current()
      .then((next) => {
        if (cancelled) {
          URL.revokeObjectURL(next.url);
          return;
        }
        objectUrl = next.url;
        setResult({ key: cacheKey, preview: next });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: cacheKey, failed: true });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cacheKey]);

  const current = result.key === cacheKey ? result : null;
  const preview = current?.preview ?? null;
  const error = current?.failed ?? false;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const renderable = preview !== null && isPreviewable(preview.mime);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{title}</p>
            {subtitle && (
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="size-3.5" />
                Download
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-secondary/40">
          {error ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="size-4" />
              That file could not be opened. Download it to view it.
            </div>
          ) : !preview ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : !renderable ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                This file type cannot be shown here
              </p>
              <p className="max-w-sm text-xs font-medium text-muted-foreground">
                Only PDFs and images are rendered inline. Download it to open it
                in the application it belongs to.
              </p>
            </div>
          ) : preview.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt={title}
              onError={() => setResult({ key: cacheKey, failed: true })}
              className="mx-auto max-h-full max-w-full object-contain"
            />
          ) : (
            <iframe src={preview.url} title={title} className="size-full" />
          )}
        </div>
      </div>
    </div>
  );
}
