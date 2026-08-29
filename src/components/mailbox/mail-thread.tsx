"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  downloadMailAttachment,
  isMailboxReauthError,
  useMailboxSettings,
  useRequestThread,
  useSyncRequestMail,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { MailAttachment, MailMessage } from "@/types/api";

/**
 * The email conversation on one sourcing request.
 *
 * Reads from `communication`, not a mail-specific table — a Gmail message and
 * a logged phone call are the same kind of thing here, and this view is a
 * filtered slice of the same timeline.
 *
 * Attachments are listed but not stored: the bytes live in Gmail and stream
 * through the backend on click (decision 2026-08-24). Inline images —
 * signature logos, almost always — are hidden behind a toggle rather than
 * dropped, so a genuine inline spec photo is still reachable.
 */
export function MailThread({
  requestId,
  onReply,
}: {
  requestId: number;
  onReply?: () => void;
}) {
  const { data: settings } = useMailboxSettings();
  const { data, isPending } = useRequestThread(requestId);
  const sync = useSyncRequestMail(requestId);

  const messages = data?.messages ?? [];

  const runSync = () => {
    sync.mutate(undefined, {
      onSuccess: (result) => {
        if (result.error) {
          toast.error(result.error, { duration: 6000 });
          return;
        }
        toast.success(
          result.synced > 0
            ? `${result.synced} new message${result.synced === 1 ? "" : "s"}`
            : "No new replies",
        );
      },
      onError: (error) => {
        if (isMailboxReauthError(error)) {
          toast.error(
            "The Gmail connection expired. Reconnect it in Settings → Supplier Mail.",
            { duration: 8000 },
          );
          return;
        }
        toast.error(error instanceof ApiError ? error.message : "Sync failed");
      },
    });
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-2 p-6 text-xs font-medium text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading conversation…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {messages.length === 0
            ? "No email on this request yet."
            : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runSync}
              disabled={sync.isPending || !settings?.account}
            >
              {sync.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Check for replies
            </Button>
          )}
          {onReply && (
            <Button type="button" size="sm" onClick={onReply}>
              <Mail />
              {messages.length ? "Reply" : "Send inquiry"}
            </Button>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            Send an inquiry and the whole conversation — including the
            supplier&rsquo;s replies and any quotation they attach — appears
            here automatically.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </ol>
      )}
    </div>
  );
}

function MessageCard({ message }: { message: MailMessage }) {
  const inbound = message.direction === "inbound";
  // Inbound replies matter most and start open; our own sent mail is usually
  // something the reader wrote and does not need to re-read.
  const [open, setOpen] = useState(inbound);
  const [showInline, setShowInline] = useState(false);

  const real = message.attachments.filter((a) => !a.is_inline);
  const inline = message.attachments.filter((a) => a.is_inline);
  const visible = showInline ? [...real, ...inline] : real;

  return (
    <li
      className={cn(
        "overflow-hidden rounded-xl border",
        inbound ? "border-primary/25 bg-primary/[0.03]" : "border-border/60 bg-card",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-secondary/40"
      >
        <span
          className={cn(
            "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
            inbound
              ? "bg-primary/10 text-primary ring-primary/20"
              : "bg-secondary text-secondary-foreground ring-border/60",
          )}
        >
          {inbound ? "Received" : "Sent"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-foreground">
            {message.subject ?? "(no subject)"}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-muted-foreground">
            {message.counterparty ?? "—"} ·{" "}
            {new Date(message.occurred_at).toLocaleString()}
          </span>
        </span>
        {real.length > 0 && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
            <Paperclip className="size-3" />
            {real.length}
          </span>
        )}
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2.5">
          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-foreground">
            {message.body?.trim() || "(no message body)"}
          </pre>

          {visible.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
              {visible.map((attachment) => (
                <AttachmentRow key={attachment.id} attachment={attachment} />
              ))}
            </ul>
          )}

          {inline.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInline((value) => !value)}
              className="mt-2 text-[10px] font-bold text-muted-foreground underline-offset-2 hover:underline"
            >
              {showInline ? "Hide" : "Show"} {inline.length} inline image
              {inline.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function AttachmentRow({ attachment }: { attachment: MailAttachment }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadMailAttachment(attachment.id, attachment.filename);
    } catch (error) {
      if (isMailboxReauthError(error)) {
        toast.error(
          "The Gmail connection expired. Reconnect it in Settings → Supplier Mail.",
          { duration: 8000 },
        );
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not download that attachment",
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-secondary/60 disabled:opacity-60"
      >
        {downloading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Download className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
          {attachment.filename}
        </span>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
          {formatSize(attachment.size_bytes)}
        </span>
      </button>
    </li>
  );
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
