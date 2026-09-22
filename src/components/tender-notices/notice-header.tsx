import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Pencil, ScanLine, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  useConfirmNotice,
  useExtractNotice,
  useUpdateNotice,
} from "@/lib/queries";
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
  const [editingTitle, setEditingTitle] = useState(false);

  /** Where "Source: EDCL" goes: the site's tender listing.
   *
   *  The source's own listing page, not this notice's page on it. A reader
   *  clicking the source name is asking "where does this come from" — the
   *  answer is edcl.gov.bd/pages/tenders, the page the fetcher polls, which
   *  stays valid long after any one notice has scrolled off it. The document
   *  itself is one click away on the Tender PDF card.
   *
   *  `notice.source_url` is the fallback for a notice with no registered
   *  source behind it — a hand-uploaded one where somebody typed the URL in. */
  const sourceHref = notice.source?.listing_url ?? notice.source_url ?? null;

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
            {editingTitle ? (
              <TitleEditor notice={notice} onDone={() => setEditingTitle(false)} />
            ) : (
              <>
                <h1 className="min-w-0 text-xl font-bold tracking-tight break-words text-foreground sm:text-2xl">
                  {notice.title}
                </h1>
                {/* The title defaults to the uploaded filename, which is rarely
                    what anyone wants to read it by. */}
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  aria-label="Rename this notice"
                  title="Rename this notice"
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition hover:border-border hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <Pencil className="size-3.5" strokeWidth={2.25} />
                </button>
              </>
            )}
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
            {sourceHref ? (
              <>
                Source:{" "}
                <a
                  href={sourceHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {notice.source_name ?? sourceHref}
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

        {/* On a phone the actions take the full width under the title. */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
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
              className="flex-1 sm:flex-none"
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
            className="flex-1 sm:flex-none"
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
              : "Confirm All Tenders"}
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Rename a notice in place.
 *
 *  The title starts life as the uploaded file's name — "EDCL_notice_aug15
 *  (2)" and the like — so this is less an edit than the first chance to give
 *  the notice a name a person would recognise it by. Only the title: the
 *  source and dates are facts read off the document, corrected on the tenders
 *  themselves rather than here.
 */
function TitleEditor({
  notice,
  onDone,
}: {
  notice: TenderNoticeDetail;
  onDone: () => void;
}) {
  const update = useUpdateNotice();
  const [title, setTitle] = useState(notice.title);
  const trimmed = title.trim();

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmed) return;
    if (trimmed === notice.title) {
      onDone();
      return;
    }
    update.mutate(
      { noticeId: notice.id, title: trimmed },
      {
        onSuccess: () => {
          toast.success("Notice renamed.");
          onDone();
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : "Could not rename",
            { duration: 7000 },
          ),
      },
    );
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={300}
        required
        autoFocus
        aria-label="Notice title"
        // Escape abandons the edit, which is what Escape means in a field
        // that opened over the thing it is editing.
        onKeyDown={(event) => {
          if (event.key === "Escape") onDone();
        }}
        className="h-9 w-full min-w-0 text-lg font-bold sm:w-[28rem]"
      />
      <Button type="submit" size="sm" disabled={!trimmed || update.isPending}>
        {update.isPending ? <Loader2 className="animate-spin" /> : <Check />}
        Save
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onDone}>
        <X />
        Cancel
      </Button>
    </form>
  );
}
