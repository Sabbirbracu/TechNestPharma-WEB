"use client";

import { useState } from "react";
import {
  ArrowDownWideNarrow,
  LayoutGrid,
  List,
  Loader2,
  ScanLine,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { useDeleteNotice, useTenderNotices } from "@/lib/queries";
import { NoticeCard, NoticeRow, publishedSortKey } from "./notice-row";
import type { TenderNoticeListItem } from "@/types/api";
import { SourceStatusBand } from "./source-status-band";
import { UploadButton } from "./notice-upload-button";

type SortKey = "published:desc" | "published:asc" | "title:asc" | "tenders:desc" | "mapped:asc";

const SORT_LABEL: Record<SortKey, string> = {
  "published:desc": "Published Date (Newest)",
  "published:asc": "Published Date (Oldest)",
  "title:asc": "Title (A–Z)",
  "tenders:desc": "Most Tenders",
  "mapped:asc": "Least Mapped",
};

/** Client-side: the inbox loads one page of 50, all of which is on screen. */
function sortNotices(notices: TenderNoticeListItem[], sort: SortKey) {
  const ratio = (n: TenderNoticeListItem) =>
    n.item_count > 0 ? n.mapped_count / n.item_count : 1;
  const sorted = [...notices];
  switch (sort) {
    case "published:desc":
      return sorted.sort((a, b) => publishedSortKey(b).localeCompare(publishedSortKey(a)));
    case "published:asc":
      return sorted.sort((a, b) => publishedSortKey(a).localeCompare(publishedSortKey(b)));
    case "title:asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "tenders:desc":
      return sorted.sort((a, b) => b.tender_count - a.tender_count);
    case "mapped:asc":
      return sorted.sort((a, b) => ratio(a) - ratio(b));
  }
}

/**
 * The notice inbox — one row per published document.
 *
 * Rows are titled by the NOTICE, not by a tender reference: a single EDCL
 * notice carries six tenders, and putting a reference here would name one of
 * them and hide the rest. Reference numbers belong one level down, on the
 * tenders inside the notice.
 */
export function NoticeList() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sort, setSort] = useState<SortKey>("published:desc");
  const [view, setView] = useState<"list" | "grid">("list");
  const { data, isPending } = useTenderNotices({ page: 1, size: 50 });
  const deleteNotice = useDeleteNotice();
  const notices = data?.items ?? [];

  const matching = query.trim()
    ? notices.filter((notice) =>
        [notice.title, notice.source_name, notice.original_filename]
          .filter(Boolean)
          .some((field) =>
            String(field).toLowerCase().includes(query.trim().toLowerCase()),
          ),
      )
    : notices;
  const filtered = sortNotices(matching, sort);

  const visibleIds = filtered.map((notice) => notice.id);
  const selectedVisible = visibleIds.filter((id) => selected.has(id));
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;

  /** Searching changes *which* rows are on screen, so a selection made against
   *  the old list would delete things the reader can no longer see. */
  function changeQuery(next: string) {
    setQuery(next);
    setSelected(new Set());
  }

  function toggleRow(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  /** One DELETE per id (there is no bulk endpoint) — `allSettled` so one bad
   *  id in a batch of twenty doesn't stop the other nineteen going through. */
  async function bulkDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const label = `${ids.length} notice${ids.length === 1 ? "" : "s"}`;

    setDeleting(true);
    const results = await Promise.allSettled(
      ids.map((id) => deleteNotice.mutateAsync(id)),
    );
    const failed = results.filter((result) => result.status === "rejected").length;
    const succeeded = results.length - failed;

    if (failed === 0) {
      toast.success(`Archived ${label}. Confirmed tenders were kept.`, {
        duration: 6000,
      });
    } else if (succeeded === 0) {
      toast.error(`Could not archive ${label}`, { duration: 6000 });
    } else {
      toast.error(
        `Archived ${succeeded} of ${results.length} notices — ${failed} failed`,
        { duration: 6000 },
      );
    }
    setSelected(new Set());
    setDeleting(false);
    setConfirming(false);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-lg font-bold text-foreground">Tender Notices</h1>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            Published notices captured from procuring authorities. Each one
            holds several tenders, and each tender its own list of items.
          </p>
        </div>
        <UploadButton />
      </header>

      {/* Whether the scheduled fetchers are alive. Silent-failure insurance:
          a broken scraper and a quiet week look identical on this page. */}
      <SourceStatusBand />

      <Input
        value={query}
        onChange={(event) => changeQuery(event.target.value)}
        placeholder="Search notices by title, source, or filename…"
        className="w-full sm:max-w-md"
      />

      {isPending ? (
        <div className="flex items-center gap-2 p-8 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading notices…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ScanLine}
          title={query ? "No notices match that search" : "No notices yet"}
          description={
            query
              ? "Try a different title, source, or filename."
              : "Upload a tender notice PDF. The system reads the tenders and their items out of it, then suggests a catalogue product for each item."
          }
        />
      ) : (
        <div className="space-y-3">
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-3.5 py-3 shadow-sm transition sm:px-5",
              selected.size > 0 && "border-primary/30 bg-primary/[0.04]",
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={selectedVisible.length > 0 && !allVisibleSelected}
                onChange={toggleAllVisible}
                aria-label="Select all notices"
              />
              <span className="text-sm font-semibold text-foreground">
                {selected.size > 0 ? (
                  <>
                    <span className="tabular-nums">{selected.size}</span>{" "}
                    {selected.size === 1 ? "notice" : "notices"} selected
                  </>
                ) : (
                  <>
                    <span className="tabular-nums">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "notice" : "notices"} found
                  </>
                )}
              </span>
              {selected.size > 0 && (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirming(true)}
                    disabled={deleting}
                    className="h-7 text-xs"
                  >
                    {deleting ? (
                      <Loader2 className="animate-spin" strokeWidth={2.25} />
                    ) : (
                      <Trash2 strokeWidth={2.25} />
                    )}
                    Delete<span className="hidden sm:inline"> selected</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(new Set())}
                    disabled={deleting}
                    className="h-7 text-xs"
                  >
                    <X strokeWidth={2.25} />
                    Clear
                  </Button>
                </>
              )}
            </div>

            {/* On a phone this group takes its own line: the sort select
                stretches, and the label text gives way to the icon. */}
            <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-wrap">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none [&>div]:min-w-0 [&>div]:flex-1">
                <ArrowDownWideNarrow
                  className="size-4 text-muted-foreground"
                  strokeWidth={2}
                />
                <span className="hidden whitespace-nowrap text-sm font-medium text-foreground sm:inline">
                  Sort by
                </span>
                <Select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  aria-label="Sort notices"
                  className="h-10 w-full sm:min-w-52"
                >
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABEL[key]}
                    </option>
                  ))}
                </Select>
              </label>

              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
                <ViewToggle
                  active={view === "list"}
                  onClick={() => setView("list")}
                  label="List view"
                  icon={<List className="size-4" strokeWidth={2.25} />}
                />
                <ViewToggle
                  active={view === "grid"}
                  onClick={() => setView("grid")}
                  label="Grid view"
                  icon={<LayoutGrid className="size-4" strokeWidth={2.25} />}
                />
              </div>
            </div>
          </div>

          {view === "list" ? (
            <ul className="space-y-3">
              {filtered.map((notice) => (
                <NoticeRow
                  key={notice.id}
                  notice={notice}
                  selected={selected.has(notice.id)}
                  onToggle={() => toggleRow(notice.id)}
                />
              ))}
            </ul>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((notice) => (
                <NoticeCard
                  key={notice.id}
                  notice={notice}
                  selected={selected.has(notice.id)}
                  onToggle={() => toggleRow(notice.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={`Delete ${selected.size} notice${selected.size === 1 ? "" : "s"}?`}
          description={
            <>
              {selected.size === 1 ? "The notice" : "The notices"} and any
              tenders still in draft will be archived. Tenders already confirmed
              are live bids and are left alone.
            </>
          }
          confirmLabel={deleting ? "Deleting…" : "Delete"}
          busy={deleting}
          onConfirm={bulkDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}
