"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useNoticeDocument } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * The stored notice document, shared by everything that shows it.
 *
 * Pulled out of the Source Document panel when the item-name check screen
 * needed the same viewer beside the extracted lines. The awkward parts are the
 * ones worth having in one place:
 *
 *   * The endpoint authenticates on the `Authorization` header, so the file
 *     has to be FETCHED — a bare URL in an `<iframe src>` or `<a href>` is
 *     sent without one and comes back 401.
 *   * The object URL that makes the blob viewable has to be revoked, or it
 *     pins the whole file in memory for the life of the tab.
 *   * A "PDF" is as often a scan, which an `<img>` displays better than an
 *     `<iframe>`.
 *
 * Split into a hook and a frame rather than one component because the two
 * callers put different chrome around the same document: the panel has a
 * toolbar that needs the URL, the dialog does not.
 */
export function useNoticeDocumentUrl(noticeId: number, enabled = true) {
  const { data: file, isPending, error } = useNoticeDocument(noticeId, enabled);
  const [url, setUrl] = useState<string | null>(null);

  // Created AND revoked in one effect, deliberately.
  //
  // The obvious version — `useMemo` to create, an effect cleanup to revoke —
  // is broken under StrictMode, which mounts every component twice: setup,
  // cleanup, setup. The cleanup revokes the URL, and the second setup does not
  // produce a new one because the memo's dependency (the blob) never changed,
  // so the viewer is left pointing at a dead URL. It renders or not depending
  // on whether the browser finished reading the blob in the milliseconds
  // before the revoke — the same document failing on one tender and working on
  // the next.
  //
  // Owning both halves here means the second setup mints a fresh URL, and the
  // revoke still happens on a real unmount, so the file is not pinned in
  // memory for the life of the tab.
  useEffect(() => {
    const objectUrl = file ? URL.createObjectURL(file) : null;
    // An object URL is an external resource this effect creates and destroys,
    // which is the case the rule exists to allow. Deriving it during render
    // instead is what produced the revoked-URL bug described above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return { file, url, isPending, error };
}

export function NoticeDocumentFrame({
  url,
  file,
  filename,
  isPending,
  error,
  className,
}: {
  url: string | null;
  file: Blob | undefined;
  filename: string;
  isPending: boolean;
  error: unknown;
  /** Height of the viewing area. Callers own it: the panel sizes against the
   *  viewport, the dialog fills its pane. */
  className?: string;
}) {
  // The blob's own type is the Content-Type the API served, which beats
  // guessing from the extension — a scan uploaded as "notice.pdf" that is
  // really a JPEG renders correctly either way.
  const isPdf = file
    ? file.type.includes("pdf") || (!file.type && filename.endsWith(".pdf"))
    : true;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-secondary/30",
        className,
      )}
    >
      {isPending ? (
        <div className="flex h-full min-h-40 items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading document…
        </div>
      ) : error || !url ? (
        <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-bold text-foreground">
            Could not load the document
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            {error instanceof ApiError
              ? error.message
              : "The stored file could not be read."}
          </p>
        </div>
      ) : isPdf ? (
        /* `#view=Fit` asks the browser's own PDF viewer to scale a whole page
           into the frame instead of showing the top of it at 100% and leaving
           the rest below the fold. */
        <iframe
          src={`${url}#view=Fit&navpanes=0&pagemode=none`}
          title={filename}
          className="size-full border-0 bg-card"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={filename}
          className="size-full bg-card object-contain"
        />
      )}
    </div>
  );
}
