"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Download,
  ExternalLink,
  Loader2,
  Package,
  Paperclip,
  Reply,
  Search,
  SendHorizontal,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { downloadMailAttachment, useSentMail } from "@/lib/queries";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import type { SentMessage } from "@/types/api";

/**
 * The Sent tab.
 *
 * Deliberately not a mirror of Gmail's Sent folder. It reads the ERP's own
 * `communication` rows, which every send path already writes, and that choice
 * is the whole character of the screen:
 *
 *   * It costs no Gmail quota and survives the weekly grant expiry — the
 *     moment "what did I send that supplier?" is hardest to answer elsewhere.
 *   * It searches bodies, which the provider would charge a round-trip each.
 *   * Every row knows its supplier and its enquiry, so it links back into
 *     Sourcing instead of being a dead end. A Sent folder cannot do that.
 *   * It contains only what this system sent. Mail the owner sends from his
 *     phone stays out, which is the same line the inbox filter draws.
 *
 * The trade-off, stated plainly: mail sent from Gmail directly is not here.
 * That is the point, not an omission.
 */

export function SentMail({
  onReply,
}: {
  onReply: (message: SentMessage) => void;
}) {
  const [draft, setDraft] = useState("");
  const [untrackedOnly, setUntrackedOnly] = useState(false);
  const [selected, setSelected] = useState<SentMessage | null>(null);
  const search = useDebounced(draft.trim());

  // Narrowing starts a new list, so the open message is closed with it.
  function narrow(apply: () => void) {
    apply();
    setSelected(null);
  }

  const query = useSentMail({
    ...(search ? { q: search } : {}),
    ...(untrackedOnly ? { untracked: true } : {}),
  });

  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.total ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-secondary/15 px-3 py-2">
        <div className="relative min-w-[200px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={draft}
            onChange={(event) => narrow(() => setDraft(event.target.value))}
            placeholder="Search subject, recipient or body…"
            aria-label="Search sent mail"
            className="h-9 pl-9 text-sm font-normal"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 pr-1">
          <Checkbox
            checked={untrackedOnly}
            onChange={(event) =>
              narrow(() => setUntrackedOnly(event.target.checked))
            }
          />
          <span
            className="text-[13px] font-medium text-foreground"
            title="Mail that belongs to no sourcing request — the sends that appear nowhere else in the app."
          >
            Not from Sourcing
          </span>
        </label>
      </div>

      <div className="grid min-h-0 grid-cols-1 lg:h-[calc(100vh-14.5rem)] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-border lg:border-r">
          {query.error ? (
            <div
              role="alert"
              className="flex flex-1 items-center justify-center gap-2 p-8 text-sm font-semibold text-destructive"
            >
              <AlertCircle className="size-4" />
              Sent mail could not be loaded.
            </div>
          ) : query.isPending ? (
            <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm font-medium text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <SendHorizontal className="size-6 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                {search || untrackedOnly
                  ? "Nothing matches that"
                  : "Nothing sent yet"}
              </p>
              <p className="max-w-xs text-xs font-medium text-muted-foreground">
                {search || untrackedOnly
                  ? "Clear the search or the filter to see everything sent."
                  : "Every email this system sends — from an enquiry or from New Email — is listed here."}
              </p>
            </div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {messages.map((message) => (
                <SentRow
                  key={message.id}
                  message={message}
                  active={selected?.id === message.id}
                  onSelect={() => setSelected(message)}
                />
              ))}
            </ul>
          )}

          {messages.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {messages.length} of {total}
              </span>
              {query.hasNextPage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Load more
                </Button>
              )}
            </div>
          )}
        </div>

        <SentReader
          message={selected}
          onClose={() => setSelected(null)}
          onReply={onReply}
        />
      </div>
    </>
  );
}

function SentRow({
  message,
  active,
  onSelect,
}: {
  message: SentMessage;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full flex-col gap-1 border-b border-border/60 px-3 py-3 text-left transition-colors",
          active ? "bg-primary/[0.06]" : "hover:bg-secondary/40",
        )}
      >
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] font-semibold",
              message.counterparty || message.company
                ? "text-foreground"
                : "italic text-muted-foreground",
            )}
          >
            {recipientOf(message)}
          </span>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
            {formatWhen(message.occurred_at)}
          </span>
        </div>

        <span className="truncate text-[13px] font-medium text-foreground">
          {message.subject || "(no subject)"}
        </span>

        {message.body && (
          <span className="line-clamp-1 text-[11px] font-medium text-muted-foreground">
            {preview(message.body)}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {message.request ? (
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-tile-green-bg px-1.5 py-0.5 text-[10px] font-bold text-tile-green">
              <Package className="size-3 shrink-0" />
              <span className="truncate">{message.request.product_name}</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-tile-amber-bg px-1.5 py-0.5 text-[10px] font-bold text-tile-amber">
              Not from Sourcing
            </span>
          )}
          {message.company && message.counterparty && (
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              <Building2 className="size-3 shrink-0" />
              <span className="truncate">{message.company.name_en}</span>
            </span>
          )}
          {message.has_attachments && (
            <Paperclip
              className="size-3 text-muted-foreground"
              aria-label="Has attachments"
            />
          )}
        </div>
      </button>
    </li>
  );
}

function SentReader({
  message,
  onClose,
  onReply,
}: {
  message: SentMessage | null;
  onClose: () => void;
  onReply: (message: SentMessage) => void;
}) {
  if (!message) {
    return (
      <div className="hidden min-h-0 flex-col items-center justify-center gap-2 bg-secondary/10 p-8 text-center lg:flex">
        <SendHorizontal className="size-6 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">
          Pick a message to read it
        </p>
        <p className="max-w-xs text-xs font-medium text-muted-foreground">
          Everything this system emailed, with the supplier and the enquiry it
          belongs to.
        </p>
      </div>
    );
  }

  const visibleAttachments = message.attachments.filter(
    (item) => !item.is_inline,
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-foreground">
            {message.subject || "(no subject)"}
          </h2>
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
            To {recipientOf(message)} ·{" "}
            {new Date(message.occurred_at).toLocaleString()}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {message.counterparty && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReply(message)}
              title="Write into this conversation"
            >
              <Reply className="size-3.5" />
              <span className="hidden sm:inline">Follow up</span>
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {(message.request || message.company) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/15 px-4 py-2">
          {message.request && (
            <Link
              href={`/sourcing?open=${message.request.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 text-[11px] font-bold text-primary ring-1 ring-inset ring-border transition-colors hover:bg-accent/60"
            >
              <Package className="size-3.5" />
              {message.request.product_name}
              <ExternalLink className="size-3 opacity-60" />
            </Link>
          )}
          {message.company && (
            <Link
              href={`/companies/${message.company.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 text-[11px] font-bold text-primary ring-1 ring-inset ring-border transition-colors hover:bg-accent/60"
            >
              <Building2 className="size-3.5" />
              {message.company.name_en}
              <ExternalLink className="size-3 opacity-60" />
            </Link>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {message.body ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
            {message.body}
          </p>
        ) : (
          <p className="text-[13px] italic text-muted-foreground">
            No body was recorded for this message.
          </p>
        )}

        {visibleAttachments.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Attachments
            </p>
            {visibleAttachments.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  try {
                    await downloadMailAttachment(item.id, item.filename);
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not download it.",
                    );
                  }
                }}
                className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent/50"
              >
                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                  {item.filename}
                </span>
                <Download className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Who it went to.
 *
 *  `counterparty` is the address recorded at send time and is what should
 *  normally show. It can be absent on older rows, and the supplier the enquiry
 *  belongs to is the honest answer then — better than a blank, and true, since
 *  the enquiry went to that company either way. */
function recipientOf(message: SentMessage): string {
  return (
    message.counterparty ?? message.company?.name_en ?? "No recipient recorded"
  );
}

/** Today shows a time, this year a day and month, anything older the year too —
 *  the same shape a mail client uses, because a column of full timestamps is
 *  unreadable and a column of times is ambiguous. */
function formatWhen(value: string): string {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

function preview(body: string): string {
  return body.replace(/\s+/g, " ").trim().slice(0, 160);
}
