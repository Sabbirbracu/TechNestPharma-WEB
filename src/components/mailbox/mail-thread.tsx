"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  Loader2,
  Mail,
  MoreHorizontal,
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
import { baseSubject, splitQuotedReply } from "@/lib/mail-quote";
import { byNewest, cn } from "@/lib/utils";
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
 *
 * Newest message first. The API returns the thread oldest-first, which is the
 * right order for reading a conversation from the start and the wrong one for
 * a buyer opening an enquiry — what they came for is the latest reply, and
 * burying it under a scroll of their own sent mail is the problem this screen
 * exists to fix.
 *
 * Two things every message in a thread repeats are dropped from the cards and
 * shown once above them: the subject (after the first reply it is only ever
 * "Re: " plus what the card header already says) and the quoted copy of the
 * message being answered. A supplier replying "Not available" was rendering
 * as our own forty-line inquiry with the answer lost at the top of it.
 */
/** What a reply needs in order to continue a conversation rather than start
 *  one. Null when the enquiry has not been sent yet — there is no thread to
 *  reply into, so the caller opens the enquiry composer instead. */
export type ThreadReplyContext = {
  to: string;
  subject: string;
  threadId: string;
};

export function MailThread({
  requestId,
  onReply,
}: {
  requestId: number;
  onReply?: (context: ThreadReplyContext | null) => void;
}) {
  const { data: settings } = useMailboxSettings();
  const { data, isPending } = useRequestThread(requestId);
  const sync = useSyncRequestMail(requestId);

  // Sorted here rather than trusting the API's order, so the newest-first
  // guarantee holds even if the endpoint's ordering ever changes.
  const messages = [...(data?.messages ?? [])].sort((a, b) =>
    byNewest(a.occurred_at, b.occurred_at),
  );

  // Taken from the oldest message, which carries the subject as we wrote it —
  // before the replies stacked Re: prefixes on the front of it.
  const threadSubject = baseSubject(
    messages[messages.length - 1]?.subject ?? messages[0]?.subject,
  );

  // Who a reply goes to: the supplier, read off their own latest message
  // rather than off the request, so a colleague replying from a second address
  // is answered where they actually wrote from. `messages` is newest-first.
  const latestInbound = messages.find((item) => item.direction === "inbound");
  const counterparty =
    latestInbound?.counterparty ??
    messages.find((item) => item.counterparty)?.counterparty ??
    "";

  // Null until there is both a thread and somebody in it to answer. The button
  // then reads "Send inquiry" and opens the enquiry composer, which is the
  // right tool for the first message — it carries the checklist the supplier
  // has to answer line by line.
  const replyContext: ThreadReplyContext | null =
    messages.length && data?.thread_id && counterparty
      ? {
          to: counterparty,
          subject: threadSubject.toLowerCase().startsWith("re:")
            ? threadSubject
            : `Re: ${threadSubject || "(no subject)"}`,
          threadId: data.thread_id,
        }
      : null;

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
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {threadSubject && (
            <p className="truncate text-sm font-bold text-foreground">
              {threadSubject}
            </p>
          )}
          <p className="text-xs font-medium text-muted-foreground">
            {messages.length === 0
              ? "No email on this request yet."
              : `${messages.length} message${messages.length === 1 ? "" : "s"} · newest first`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            <Button
              type="button"
              size="sm"
              onClick={() => onReply(replyContext)}
            >
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
        <ol className="space-y-2.5">
          {messages.map((message, index) => (
            // The newest message is open on arrival whichever way it went.
            // Previously only inbound mail opened, which left a thread we had
            // just replied to showing nothing but collapsed headers.
            <MessageCard
              key={message.id}
              message={message}
              threadSubject={threadSubject}
              defaultOpen={index === 0}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function MessageCard({
  message,
  threadSubject,
  defaultOpen,
}: {
  message: MailMessage;
  threadSubject: string;
  defaultOpen: boolean;
}) {
  const inbound = message.direction === "inbound";
  const [open, setOpen] = useState(defaultOpen);
  const [showInline, setShowInline] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);

  const real = message.attachments.filter((a) => !a.is_inline);
  const inline = message.attachments.filter((a) => a.is_inline);
  const visible = showInline ? [...real, ...inline] : real;

  const { reply, quoted } = splitQuotedReply(message.body);

  // The subject earns a line only when the sender changed it mid-thread.
  // Otherwise it is the thread subject with a Re: on the front, already read
  // once above the list.
  const subject = baseSubject(message.subject);
  const ownSubject = subject && subject !== threadSubject ? subject : null;

  return (
    <li
      className={cn(
        // Direction is carried by the chip's words first and its colour
        // second; the left edge just makes a long thread scannable without
        // reading either.
        "overflow-hidden rounded-xl border border-l-[3px] border-border/60 bg-card",
        inbound ? "border-l-tile-green" : "border-l-tile-blue",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-secondary/40"
      >
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
            inbound
              ? "bg-tile-green-bg text-tile-green ring-tile-green/25"
              : "bg-tile-blue-bg text-tile-blue ring-tile-blue/25",
          )}
        >
          {inbound ? "Received" : "Sent"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-foreground">
            {message.counterparty ?? "—"}
          </span>
          {ownSubject && (
            <span className="mt-0.5 block truncate text-xs font-semibold text-foreground">
              {ownSubject}
            </span>
          )}
          <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
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
        <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3">
          <pre className="max-w-3xl whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-foreground">
            {reply || "(no message body)"}
          </pre>

          {/* The quoted conversation is one click away rather than gone: the
              split is a heuristic over five mail clients, and a reply typed
              inline between our questions still lives down here. */}
          {quoted && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowQuoted((value) => !value)}
                aria-expanded={showQuoted}
                title={showQuoted ? "Hide quoted text" : "Show quoted text"}
                className="inline-flex items-center rounded-md border border-border/60 bg-secondary/60 px-1.5 py-0.5 text-muted-foreground transition hover:bg-secondary"
              >
                <MoreHorizontal className="size-3.5" />
                <span className="sr-only">
                  {showQuoted ? "Hide quoted text" : "Show quoted text"}
                </span>
              </button>

              {showQuoted && (
                <pre className="mt-2 max-w-3xl border-l-2 border-border pl-3 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-muted-foreground">
                  {quoted}
                </pre>
              )}
            </div>
          )}

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
