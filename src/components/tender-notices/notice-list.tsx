"use client";

import { useState } from "react";
import { Loader2, ScanLine } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SelectionBar } from "@/components/ui/selection-bar";
import { EmptyState } from "@/components/empty-state";
import { useDeleteNotice, useTenderNotices } from "@/lib/queries";
import { NoticeRow } from "./notice-row";
import { SourceStatusBand } from "./source-status-band";
import { UploadButton } from "./notice-upload-button";

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
  const { data, isPending } = useTenderNotices({ page: 1, size: 50 });
  const deleteNotice = useDeleteNotice();
  const notices = data?.items ?? [];

  const filtered = query.trim()
    ? notices.filter((notice) =>
        [notice.title, notice.source_name, notice.original_filename]
          .filter(Boolean)
          .some((field) =>
            String(field).toLowerCase().includes(query.trim().toLowerCase()),
          ),
      )
    : notices;

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
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
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
        className="max-w-md"
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
        <div className="space-y-2">
          <SelectionBar
            total={filtered.length}
            count={selected.size}
            allSelected={allVisibleSelected}
            someSelected={selectedVisible.length > 0 && !allVisibleSelected}
            onToggleAll={toggleAllVisible}
            onClear={() => setSelected(new Set())}
            onDelete={() => setConfirming(true)}
            deleting={deleting}
            itemLabel="notice"
          />

          <ul className="space-y-2">
            {filtered.map((notice) => (
              <NoticeRow
                key={notice.id}
                notice={notice}
                selected={selected.has(notice.id)}
                onToggle={() => toggleRow(notice.id)}
              />
            ))}
          </ul>
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
