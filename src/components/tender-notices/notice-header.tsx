import Link from "next/link";
import { ArrowLeft, Check, Loader2, ScanLine } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useConfirmNotice, useExtractNotice } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  NOTICE_STATUS_LABEL,
  NOTICE_STATUS_STYLE,
  formatDate,
} from "./notice-taxonomy";
import type { Readiness } from "./notice-readiness";
import type { TenderNoticeDetail } from "@/types/api";

export function Header({
  notice,
  readiness,
}: {
  notice: TenderNoticeDetail;
  readiness: Readiness;
}) {
  const extract = useExtractNotice(notice.id);
  const confirm = useConfirmNotice(notice.id);

  const runExtract = () =>
    extract.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          `${result.tender_count} tender(s), ${result.item_count} items — ` +
            `${result.matched_count} matched automatically.`,
        );
        result.warnings.forEach((warning) =>
          toast(warning, { icon: "⚠️", duration: 9000 }),
        );
      },
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.message : "Extraction failed",
          { duration: 8000 },
        ),
    });

  const runConfirm = () =>
    confirm.mutate(undefined, {
      onSuccess: (result) => toast.success(result.detail),
      onError: (error) =>
        toast.error(
          error instanceof ApiError ? error.message : "Could not confirm",
          { duration: 8000 },
        ),
    });

  return (
    <header className="space-y-3">
      <Link
        href="/tender-notices"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to Tender Notices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {notice.title}
            </h1>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset",
                NOTICE_STATUS_STYLE[notice.status],
              )}
            >
              {NOTICE_STATUS_LABEL[notice.status]}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {notice.source_url ? (
              <>
                Source:{" "}
                <a
                  href={notice.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {notice.source_name ?? notice.source_url}
                </a>
              </>
            ) : (
              <>Source: {notice.source_name ?? "—"}</>
            )}
            {notice.notice_date
              ? ` · Dated ${formatDate(notice.notice_date)}`
              : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Extract, never RE-extract. A second reading of the same page
              replaces the first — confirmed mappings and supplier ticks
              included — so the button disappears once there is review work to
              destroy. Reading the document again is a re-upload, not a click
              sitting next to Confirm. */}
          {notice.tenders.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runExtract}
              disabled={extract.isPending}
            >
              {extract.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ScanLine />
              )}
              Extract
            </Button>
          )}
          <Button
            type="button"
            /* Green, because confirming is the affirmative end of the pipeline
               — the brand's own role for that accent (globals.css §palette). */
            variant="success"
            size="sm"
            onClick={runConfirm}
            disabled={confirm.isPending || readiness.kind !== "ready"}
            /* The button says what it will do; when it cannot, it says why
               instead of failing on click. */
            title={
              readiness.kind === "ready"
                ? undefined
                : `${readiness.headline}. ${readiness.detail}`
            }
          >
            {confirm.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Check />
            )}
            {readiness.kind === "live"
              ? "Tenders Created"
              : "Confirm & Create Tenders"}
          </Button>
        </div>
      </div>
    </header>
  );
}
