"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useUploadNotice } from "@/lib/queries";

/** Upload a notice PDF.
 *
 *  Deduped server-side on content hash, so re-uploading the same document
 *  reports the notice it already is rather than creating a second one. */
export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadNotice();

  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice still fires a change.
    event.target.value = "";
    if (!file) return;

    upload.mutate(
      { file, title: file.name.replace(/\.[^.]+$/, ""), source_name: "EDCL" },
      {
        onSuccess: (notice) =>
          toast.success(`Captured "${notice.title}" — open it to extract.`),
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : "Upload failed",
            { duration: 7000 },
          ),
      },
    );
  };

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
        disabled={upload.isPending}
      >
        {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
        Upload Notice
      </Button>
    </>
  );
}
