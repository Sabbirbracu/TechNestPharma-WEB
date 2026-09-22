"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, FileText, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api";
import {
  useAddNoticeItem,
  useDeleteNoticeItem,
  useUpdateNoticeItem,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  type DocumentZoom,
  NoticeDocumentFrame,
  useNoticeDocumentUrl,
} from "./notice-document-view";
import {
  EXTRACTION_METHOD_LABEL,
  MAPPING_STATUS_LABEL,
  MAPPING_STATUS_STYLE,
  isGuessedText,
} from "./notice-taxonomy";
import type {
  NoticeTender,
  NoticeTenderItem,
  TenderNoticeDetail,
} from "@/types/api";

/** Opens zoomed in: a whole A4 scan squeezed into this pane leaves the item
 *  names too small to proof-read, which is the one job this dialog has. */
const DEFAULT_ZOOM: DocumentZoom = 150;

const ZOOM_OPTIONS: { value: DocumentZoom; label: string }[] = [
  { value: "page", label: "Whole page" },
  { value: "width", label: "Fit width" },
  { value: 125, label: "125%" },
  { value: 150, label: "150%" },
  { value: 200, label: "200%" },
];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** Line breaks pasted in from the PDF are not part of a name. */
function tidyName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Every extracted line beside the page it was read from — and the place to
 * correct the reading when OCR got it wrong: rename a misread line, delete one
 * the extractor invented, add one it missed.
 *
 * The lines are shown exactly as extracted, never as the matched product's
 * name, which is a different string and the very thing being verified.
 * Renaming or adding a line re-runs the product match on the server.
 */
export function ItemNameCheckDialog({
  notice,
  tender,
  open,
  onClose,
}: {
  notice: TenderNoticeDetail;
  tender: NoticeTender;
  open: boolean;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState<DocumentZoom>(DEFAULT_ZOOM);
  const { file, url, isPending, error } = useNoticeDocumentUrl(
    notice.id,
    // Not before it is asked for: this is a multi-megabyte scan, and the
    // review screen is useful without it.
    open,
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      // Escape belongs to the innermost layer: an open editor or a delete
      // confirmation handles it (and marks it handled) before this dialog.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="alertdialog"]')) return;
      setZoom(DEFAULT_ZOOM);
      onClose();
    }
    // The page behind must not scroll under a full-height dialog.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function close() {
    setZoom(DEFAULT_ZOOM);
    onClose();
  }

  const method = notice.extraction_method;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Check item names against the document — ${tender.reference_no ?? tender.name}`}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div className="relative flex h-[94vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-xl sm:max-w-[1600px] sm:rounded-2xl">
        <header className="flex items-start gap-3 border-b border-border/60 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
            <FileText className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight tracking-tight text-foreground">
              Item names against the document
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              <span className="font-mono font-bold text-foreground">
                {tender.reference_no ?? tender.name}
              </span>{" "}
              ·{" "}
              {method ? (EXTRACTION_METHOD_LABEL[method] ?? method) : "method unknown"}
              {isGuessedText(method)
                ? " — every character is a guess, so read them against the page"
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Names left, page right. The document gets the larger share: it is
            the thing being read closely, and a scan is unreadable narrow. */}
        <div className="grid min-h-0 flex-1 grid-rows-2 gap-3 p-3 lg:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)] lg:grid-rows-1">
          <ItemList tender={tender} />

          <section className="flex min-h-0 flex-col gap-2">
            <ZoomBar zoom={zoom} onChange={setZoom} />
            <NoticeDocumentFrame
              url={url}
              file={file}
              filename={notice.original_filename ?? "notice.pdf"}
              isPending={isPending}
              error={error}
              zoom={zoom}
              className="min-h-0 flex-1"
            />
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ItemList({ tender }: { tender: NoticeTender }) {
  const [adding, setAdding] = useState(false);
  const addItem = useAddNoticeItem();
  const count = tender.items.length;
  // The server appends after the highest number, which is not `count + 1`
  // once a line has been deleted.
  const nextLineNo = Math.max(0, ...tender.items.map((item) => item.line_no)) + 1;

  async function add(name: string) {
    try {
      await addItem.mutateAsync({ tenderId: tender.id, raw_name: name });
      toast.success("Line added");
      setAdding(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not add the line."));
    }
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/60">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-secondary/40 px-3 py-2">
        <span className="text-xs font-bold text-foreground">
          {count} line{count === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={adding}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="size-3" strokeWidth={2.5} />
          Add line
        </button>
      </div>

      <ol className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto">
        {count === 0 && !adding && (
          <li className="p-6 text-center text-xs font-medium text-muted-foreground">
            No lines were read from this tender. Add them from the document.
          </li>
        )}

        {tender.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}

        {/* At the end of the list, because a new line is appended after the
            last one. */}
        {adding && (
          <li className="flex gap-3 bg-primary/[0.03] px-3 py-2.5">
            <LineNumber value={nextLineNo} />
            <NameEditor
              initialValue=""
              label="New item name"
              saveLabel="Add"
              busy={addItem.isPending}
              onSave={add}
              onCancel={() => setAdding(false)}
            />
          </li>
        )}
      </ol>
    </section>
  );
}

/**
 * One extracted line: its name, grade and mapping status, with rename and
 * delete.
 *
 * The name is set in mono because that is what is being proof-read: a
 * proportional face hides exactly the confusions OCR makes — `1` against `l`,
 * `0` against `O`, `rn` against `m`.
 */
function ItemRow({ item }: { item: NoticeTenderItem }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const update = useUpdateNoticeItem();
  const remove = useDeleteNoticeItem();

  async function rename(name: string) {
    if (name === item.raw_name) {
      setEditing(false);
      return;
    }
    try {
      await update.mutateAsync({ itemId: item.id, raw_name: name });
      toast.success(`Line ${item.line_no} renamed`);
      setEditing(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not save the name."));
    }
  }

  function confirmDelete() {
    remove.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Line ${item.line_no} deleted`);
        setConfirmingDelete(false);
      },
      onError: (error) =>
        toast.error(errorMessage(error, "Could not delete the line.")),
    });
  }

  return (
    <li className="flex gap-3 px-3 py-2.5">
      <LineNumber value={item.line_no} />

      {editing ? (
        <NameEditor
          initialValue={item.raw_name}
          label={`Item name for line ${item.line_no}`}
          saveLabel="Save"
          busy={update.isPending}
          onSave={rename}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <p className="min-w-0 flex-1 break-words font-mono text-sm font-semibold leading-snug text-foreground">
              {item.raw_name}
            </p>
            <IconButton
              label={`Edit the name of line ${item.line_no}`}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" strokeWidth={2} />
            </IconButton>
            <IconButton
              label={`Delete line ${item.line_no}`}
              onClick={() => setConfirmingDelete(true)}
              destructive
            >
              <Trash2 className="size-3.5" strokeWidth={2} />
            </IconButton>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.specification && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                {item.specification}
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset",
                MAPPING_STATUS_STYLE[item.mapping_status],
              )}
            >
              {MAPPING_STATUS_LABEL[item.mapping_status]}
            </span>
          </div>

          {/* Kept subordinate on purpose. The catalogue name is a different
              string from the notice's wording, and mistaking one for the other
              is the error this screen exists to catch. */}
          {item.matched_product && (
            <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
              → matched to {item.matched_product.name_en}
              {item.matched_product.cas_number
                ? ` · CAS ${item.matched_product.cas_number}`
                : ""}
            </p>
          )}
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete line ${item.line_no}?`}
          description={
            <>
              <span className="font-mono font-semibold text-foreground">
                {item.raw_name}
              </span>{" "}
              and its supplier candidates will be removed from this tender.
            </>
          }
          confirmLabel="Delete line"
          busy={remove.isPending}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={confirmDelete}
        />
      )}
    </li>
  );
}

/** The text box shared by rename and add. Enter saves, Escape cancels. */
function NameEditor({
  initialValue,
  label,
  saveLabel,
  busy,
  onSave,
  onCancel,
}: {
  initialValue: string;
  label: string;
  saveLabel: string;
  busy: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }, []);

  function save() {
    const name = tidyName(draft);
    if (!name) {
      toast.error("An item name cannot be empty.");
      return;
    }
    onSave(name);
  }

  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            // Handled here — the dialog stays open.
            event.preventDefault();
            onCancel();
          }
        }}
        rows={2}
        disabled={busy}
        aria-label={label}
        placeholder="Type the name exactly as printed…"
        className="w-full resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 font-mono text-sm font-semibold leading-snug text-foreground shadow-sm placeholder:font-sans placeholder:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Check className="size-3" strokeWidth={2.5} />
          )}
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          Cancel
        </button>
        <span className="ml-auto text-[10px] font-medium text-muted-foreground">
          Enter to save · Esc to cancel
        </span>
      </div>
    </div>
  );
}

function ZoomBar({
  zoom,
  onChange,
}: {
  zoom: DocumentZoom;
  onChange: (zoom: DocumentZoom) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1"
      role="group"
      aria-label="Document zoom"
    >
      <span className="mr-1 text-[11px] font-semibold text-muted-foreground">
        Zoom
      </span>
      {ZOOM_OPTIONS.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={zoom === option.value}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            zoom === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LineNumber({ value }: { value: number }) {
  return (
    <span className="w-6 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-muted-foreground">
      {value}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "shrink-0 rounded-md p-1 text-muted-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        destructive
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
