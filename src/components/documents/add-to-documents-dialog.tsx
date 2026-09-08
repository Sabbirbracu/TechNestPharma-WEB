"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useSaveInboxAttachment, useSaveMailAttachment } from "@/lib/queries";
import type { DocumentTarget } from "@/types/api";
import {
  DocumentMetadataFields,
  EMPTY_METADATA,
  defaultTargetFor,
  type DocumentMetadata,
} from "./document-metadata-fields";

/**
 * "Add to Documents" for one email attachment.
 *
 * The bytes never come through the browser — the server fetches them from Gmail
 * and stores them — so this dialog posts metadata, not a file. A 30 MB
 * quotation is kept without being downloaded and re-uploaded across the user's
 * connection.
 *
 * What the ERP already knows is filled in, and only what it cannot know is
 * asked. When the message was matched to a supplier, that supplier is
 * pre-selected; the user is usually left choosing one thing — what kind of
 * document this is.
 *
 * Opened from two places with two different handles on the same file, hence
 * `source`: the inbox addresses an attachment by Gmail message and MIME part
 * (nothing about it is stored), while the sourcing conversation has a
 * `mail_attachment` row and an id.
 */
export type AttachmentSource =
  | { kind: "inbox"; messageId: string; partId: string }
  | { kind: "synced"; attachmentId: number };

export function AddToDocumentsDialog({
  source,
  filename,
  companyId,
  companyName,
  sourcingRequestId,
  sourcingRequestLabel,
  onSaved,
  onClose,
}: {
  source: AttachmentSource;
  filename: string;
  /** The sender's company, when the inbox recognised one. */
  companyId?: number | null;
  companyName?: string | null;
  /** The enquiry this conversation belongs to, when it belongs to one.
   *
   *  Preferred over the company as the default filing target, and the fix for
   *  a real complaint: a file saved from a thread that *was* an enquiry landed
   *  on the company, so it appeared in the library but not on the enquiry's own
   *  Documents tab — which is where the person who saved it went looking. */
  sourcingRequestId?: number | null;
  /** What to call that enquiry — its product, when the caller knows it. */
  sourcingRequestLabel?: string | null;
  /** Fired on a successful save, so a caller reading its thread live from
   *  Gmail can show the file as filed without re-fetching to learn it. */
  onSaved?: () => void;
  onClose: () => void;
}) {
  const [metadata, setMetadata] = useState<DocumentMetadata>(() => {
    if (sourcingRequestId) {
      return {
        ...EMPTY_METADATA,
        docType: "quotation",
        target: "sourcing",
        targetId: String(sourcingRequestId),
      };
    }
    return {
      ...EMPTY_METADATA,
      docType: "quotation",
      target: companyId ? "company" : defaultTargetFor("quotation"),
      targetId: companyId ? String(companyId) : "",
    };
  });
  const saveInbox = useSaveInboxAttachment();
  const saveSynced = useSaveMailAttachment();
  const save = source.kind === "inbox" ? saveInbox : saveSynced;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Same guard the shared ConfirmDialog uses: the portal target only exists in
  // the browser, and this renders on a user action so there is no hydration
  // pass to miss.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to Documents"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground">
              Add to Documents
            </h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              Keeps this attachment in the library. Deleting the email will no
              longer lose it.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-3.5 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/12 dark:text-red-300">
              <FileText className="size-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-foreground">
                {filename}
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                Source: Email
                {companyName ? ` · ${companyName}` : ""}
              </span>
            </span>
          </div>

          <DocumentMetadataFields
            value={metadata}
            onChange={setMetadata}
            idPrefix="save"
            presetTargetLabel={
              sourcingRequestId
                ? (sourcingRequestLabel ?? "This enquiry")
                : null
            }
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3.5">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={async () => {
              try {
                const shared = {
                  docType: metadata.docType,
                  title: filename,
                  notes: metadata.notes || undefined,
                  target: metadata.targetId
                    ? (metadata.target as DocumentTarget)
                    : undefined,
                  targetId: metadata.targetId
                    ? Number(metadata.targetId)
                    : undefined,
                };
                const result =
                  source.kind === "inbox"
                    ? await saveInbox.mutateAsync({
                        messageId: source.messageId,
                        partId: source.partId,
                        ...shared,
                      })
                    : await saveSynced.mutateAsync({
                        attachmentId: source.attachmentId,
                        ...shared,
                      });
                toast.success(
                  result.duplicate_of_existing
                    ? "Already in the library — filed, not stored twice."
                    : "Document added.",
                );
                onSaved?.();
                onClose();
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Could not save it.",
                );
              }
            }}
          >
            {save.isPending && <Loader2 className="animate-spin" />}
            Save Document
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
