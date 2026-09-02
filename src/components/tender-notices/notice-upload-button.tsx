"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useExtractNoticeById, useUploadNotice } from "@/lib/queries";

/** Upload a notice PDF and read it, in one action.
 *
 *  Extraction is chained here rather than folded into the upload endpoint:
 *  reading a scanned notice runs OCR and is slow, and keeping it a second
 *  request means the upload still returns straight away, the button can say
 *  which phase it is in, and a failed reading leaves the stored document
 *  intact — the notice page's Extract button is still there to retry by hand.
 *
 *  Uploads are deduped server-side on content hash, so re-uploading the same
 *  document reports the notice it already is rather than creating a second. */
export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadNotice();
  const extract = useExtractNoticeById();

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    // One toast for the whole job, rewritten as it moves: two separate
    // requests, but from here it is a single "I uploaded a notice" action.
    const toastId = toast.loading("Uploading the notice…");

    upload.mutate(
      { file, title: file.name.replace(/\.[^.]+$/, ""), source_name: "EDCL" },
      {
        onSuccess: (notice) => {
          toast.loading("Reading the document…", { id: toastId });
          extract.mutate(notice.id, {
            onSuccess: (result) => {
              toast.success(
                `"${notice.title}" — ${result.tender_count} tender(s), ` +
                  `${result.item_count} items, ${result.matched_count} matched.`,
                { id: toastId, duration: 7000 },
              );
              result.warnings.forEach((warning) =>
                toast(warning, { icon: "⚠️", duration: 9000 }),
              );
            },
            // The document is safely on file either way; only the reading
            // failed, and the notice page still offers Extract by hand.
            onError: (error) =>
              toast.error(
                `Uploaded, but could not read it: ` +
                  `${error instanceof ApiError ? error.message : "extraction failed"}. ` +
                  `Open the notice and press Extract.`,
                { id: toastId, duration: 10000 },
              ),
          });
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : "Upload failed",
            { id: toastId, duration: 7000 },
          ),
      },
    );
  };

  const busy = upload.isPending || extract.isPending;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.webp"
        onChange={onPick}
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        {extract.isPending ? "Reading…" : "Upload Notice"}
      </Button>
    </>
  );
}
