"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NoticeDocumentFrame,
  useNoticeDocumentUrl,
} from "./notice-document-view";
import { EXTRACTION_METHOD_LABEL, formatFileSize } from "./notice-taxonomy";
import type { TenderNoticeDetail } from "@/types/api";

/**
 * The stored notice, read inline.
 *
 * Side-by-side reading is the whole point of this panel — the backend even
 * serves the file `inline` rather than as an attachment for exactly that
 * reason — so the document is embedded rather than left behind a link.
 *
 * The fetch-as-blob dance lives in `useNoticeDocumentUrl`, shared with the
 * item-name check dialog.
 */
export function SourceDocument({ notice }: { notice: TenderNoticeDetail }) {
  const { file, url, isPending, error } = useNoticeDocumentUrl(notice.id);
  const filename = notice.original_filename ?? "notice.pdf";

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {filename}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {formatFileSize(notice.file_size_bytes)}
              {notice.page_count ? ` · ${notice.page_count} page(s)` : ""}
              {notice.extraction_method
                ? ` · ${EXTRACTION_METHOD_LABEL[notice.extraction_method] ?? notice.extraction_method}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!url}
            onClick={() => url && window.open(url, "_blank", "noopener")}
          >
            <ExternalLink />
            Open in new tab
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!url}
            onClick={() => {
              if (!url) return;
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
          >
            <Download />
            Download
          </Button>
        </div>
      </div>

      <NoticeDocumentFrame
        url={url}
        file={file}
        filename={filename}
        isPending={isPending}
        error={error}
        className="h-[calc(100vh-13rem)] min-h-[560px]"
      />
    </div>
  );
}
