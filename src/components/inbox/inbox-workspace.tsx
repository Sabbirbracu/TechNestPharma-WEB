"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  Ban,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  Inbox as InboxIcon,
  Loader2,
  Mail,
  MailQuestion,
  Paperclip,
  PenSquare,
  RefreshCw,
  Reply,
  ShieldQuestion,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ComposeDialog } from "@/components/inbox/compose-dialog";
import { baseSubject, splitQuotedReply } from "@/lib/mail-quote";
import {
  downloadInboxAttachment,
  isMailboxReauthError,
  useFileInboxThread,
  useInbox,
  useInboxThread,
  useMailboxSettings,
  useSetSenderRule,
} from "@/lib/queries";
import { byNewest, cn } from "@/lib/utils";
import type { InboxBucket, InboxMessage } from "@/types/api";

/**
 * The inbox (2026-08-31, redesigned 2026-09-02).
 *
 * Why this screen exists: until now the only way to email from the ERP was
 * from a tender or a product, so a supplier who wrote *first* was invisible
 * here, and an email that belonged to no bid had nowhere to be sent from.
 *
 * The hard part was never the reading — it was that the mailbox behind this is
 * the client's personal @gmail.com, carrying his hosting invoices and his
 * private mail alongside supplier quotations. Showing all of it would be
 * unusable; showing only what the ERP already knew about would miss the thing
 * he asked for. So the mail is sorted by a plain logic filter — Gmail's own
 * categories, mailing-list headers, and the ERP's address book — into three
 * tabs, and the sorting is corrected by hand rather than guessed at by a
 * model. See `app/core/mail_filter.py` for the layers and the reasoning.
 *
 * Three properties this screen has to keep:
 *
 *   1. **Nothing is stored by looking.** Rows are fetched from Gmail, rendered
 *      and forgotten. Only Reply and File write to the database.
 *   2. **Nothing is hidden irreversibly.** Filtered is a tab, not a bin. A
 *      supplier Gmail miscategorised has to be findable in one click.
 *   3. **Every verdict shows its reason.** A filter whose workings are
 *      invisible is one the buyer stops trusting the first time it is wrong —
 *      and his correction is the only thing that makes it better.
 *
 * --- On the layout (2026-09-02) --------------------------------------------
 *
 * The first version stacked bordered cards down the page: every row carried a
 * box, a reason badge, a company badge and its own triage buttons, which meant
 * a screen of mail was a screen of chrome and the eye had nothing to run down.
 * A mail list is read by scanning one column of senders, so this version gives
 * the row a single flat line — avatar, sender, subject, snippet, time — with a
 * shared column grid and hairline separators instead of per-row borders.
 *
 * Two deliberate departures from Gmail rather than imitations of it:
 *
 *   - **The reason stays visible on the row.** Gmail's categories are silent;
 *     property 3 above is the whole basis of trusting this filter, so the
 *     verdict is a quiet inline note by the sender rather than a badge, and is
 *     never hidden behind a hover.
 *   - **Row actions replace the timestamp on hover** instead of appearing
 *     under the row. Nothing reflows, so the list never jumps under the cursor
 *     while the buyer is aiming at it.
 *
 * Keyboard: j/k or the arrow keys step through the list (selecting a row *is*
 * opening it, so there is no separate open key), r replies to the open message
 * and Esc closes it. The panes scroll independently under a fixed toolbar, so
 * the tab bar and the conversation header stay put on a long mailbox.
 */

const TABS: {
  bucket: InboxBucket;
  label: string;
  hint: string;
  icon: typeof InboxIcon;
}[] = [
  {
    bucket: "business",
    label: "Business",
    hint: "Senders recognised from your companies and contacts, plus every conversation this system started.",
    icon: InboxIcon,
  },
  {
    bucket: "unsorted",
    label: "Unsorted",
    hint: "Real people writing from an address you have not dealt with before. Sort them once and they stay sorted.",
    icon: MailQuestion,
  },
  {
    bucket: "filtered",
    label: "Filtered",
    hint: "Newsletters, promotions and automated mail. Kept visible so nothing is lost — mark anything here as business if it was misjudged.",
    icon: Archive,
  },
];

export function InboxWorkspace() {
  const [bucket, setBucket] = useState<InboxBucket>("business");
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [compose, setCompose] = useState<{
    to: string;
    subject: string;
    threadId: string | null;
  } | null>(null);

  const { data: settings } = useMailboxSettings();
  const connected = settings?.account?.status === "connected";

  const page = useInbox(bucket, pageToken, { enabled: Boolean(connected) });
  const messages = useMemo(() => page.data?.messages ?? [], [page.data]);

  const switchTab = useCallback((next: InboxBucket) => {
    setBucket(next);
    // Gmail's page tokens are per-query, so a token from the focused query is
    // meaningless against the unfiltered one the Filtered tab uses. Resetting
    // is not a nicety; carrying it over would return the wrong page.
    setPageToken(null);
    setSelected(null);
  }, []);

  const openReply = useCallback((message: InboxMessage) => {
    const subject = baseSubject(message.subject) || "(no subject)";
    setCompose({
      to: message.from_address ?? "",
      subject: subject.toLowerCase().startsWith("re:")
        ? subject
        : `Re: ${subject}`,
      threadId: message.thread_id,
    });
  }, []);

  // Keyboard navigation. Held to the list rather than the document's focus so
  // the buyer can read a long conversation on the right and still step to the
  // next message without reaching for the mouse.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (compose) return;
      const target = event.target as HTMLElement | null;
      // Never steal a keystroke from something being typed into.
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const index = selected
        ? messages.findIndex((m) => m.message_id === selected.message_id)
        : -1;

      switch (event.key) {
        case "j":
        case "ArrowDown": {
          if (!messages.length) return;
          event.preventDefault();
          setSelected(messages[Math.min(index + 1, messages.length - 1)]);
          return;
        }
        case "k":
        case "ArrowUp": {
          if (!messages.length) return;
          event.preventDefault();
          setSelected(messages[Math.max(index - 1, 0)]);
          return;
        }
        case "r": {
          if (!selected) return;
          event.preventDefault();
          openReply(selected);
          return;
        }
        case "Escape": {
          if (selected) {
            event.preventDefault();
            setSelected(null);
          }
          return;
        }
        default:
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compose, messages, selected, openReply]);

  if (settings && !settings.account) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Mail}
          title="No mailbox connected yet"
          description="Connect your Gmail account in Settings → Supplier Mail, and this page will show what arrives in it."
        >
          <Link
            href="/settings/mailbox"
            className="inline-flex h-10 items-center justify-center rounded-xl border-2 border-input bg-card px-5 text-sm font-semibold shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/70"
          >
            Open mailbox settings
          </Link>
        </EmptyState>
      </div>
    );
  }

  const activeTab = TABS.find((tab) => tab.bucket === bucket);

  // The table body loads as one block: nothing partial, nothing stale, a
  // spinner over the whole area until every row is ready.
  //
  // `isPlaceholderData` is the load-bearing half. `useInbox` sets
  // `placeholderData: keepPreviousData`, so on a tab switch React Query keeps
  // serving the *previous* bucket's rows — `isPending` stays false and the
  // list carried on showing Business mail underneath the Unsorted tab. That
  // was worse than a missing spinner: it labelled one bucket's mail as
  // another's. This flag is how that borrowed data is recognised.
  //
  // Deliberately not `isFetching`: that is also true for the background
  // refetch React Query runs when the window regains focus, and blanking the
  // mailbox every time the client alt-tabs back would be its own bug. A tab
  // read in the last 30s (the query's staleTime) is served from cache and
  // stays instant rather than spinning at a result we already have.
  const loadingTable =
    !settings || (connected && (page.isPending || page.isPlaceholderData));

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {settings?.account?.status === "needs_reauth" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <p className="text-sm font-medium text-warning-foreground">
            The Gmail connection has expired — this happens every 7 days on a
            personal account.{" "}
            <a href="/settings/mailbox" className="underline">
              Reconnect it
            </a>{" "}
            to load your mail.
          </p>
        </div>
      )}

      {/* The whole workspace is one card: tabs, list and reader share a frame
          so the eye reads it as a mail client rather than three widgets that
          happen to sit near each other. */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-secondary/25 px-2 py-1.5">
          <div
            role="tablist"
            aria-label="Inbox"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {TABS.map((tab) => {
              const active = tab.bucket === bucket;
              const count = page.data?.counts?.[tab.bucket];
              const Icon = tab.icon;
              return (
                <button
                  key={tab.bucket}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={tab.hint}
                  onClick={() => switchTab(tab.bucket)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-card text-primary shadow-xs"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                  {typeof count === "number" && count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        active
                          ? "bg-primary/12 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-2 -bottom-[7px] h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              title="Re-read the mailbox"
              onClick={() => page.refetch()}
              disabled={page.isFetching}
            >
              <RefreshCw
                className={cn("size-3.5", page.isFetching && "animate-spin")}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              title="Write a new email"
              onClick={() => setCompose({ to: "", subject: "", threadId: null })}
            >
              <PenSquare className="size-3.5" />
              <span className="hidden sm:inline">New Email</span>
            </Button>
          </div>
        </div>

        {/* The active tab's hint keeps its own line now that the actions have
            the top-right. It stays visible rather than becoming a tooltip:
            which mail a tab collects is the thing the buyer has to trust, and
            the per-row reason underneath is only half of that story. */}
        <p className="truncate border-b border-border bg-secondary/15 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          {activeTab?.hint}
        </p>

        {loadingTable ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="flex min-h-[24rem] flex-col items-center justify-center gap-3 bg-secondary/10 lg:h-[calc(100vh-13rem)]"
          >
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Reading your mailbox…
            </p>
            <p className="max-w-xs text-center text-xs font-medium text-muted-foreground">
              {activeTab?.label} is read live from Gmail, a message at a time,
              so this takes a moment.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 grid-cols-1 lg:h-[calc(100vh-13rem)] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <MessageList
              state={page}
              bucket={bucket}
              selectedId={selected?.message_id ?? null}
              onSelect={setSelected}
              onReply={openReply}
              onLoadMore={() => setPageToken(page.data?.next_page_token ?? null)}
            />

            <ThreadPanel
              message={selected}
              onClose={() => setSelected(null)}
              onReply={openReply}
            />
          </div>
        )}
      </div>

      {/* Keyed and conditionally mounted, so each compose starts empty rather
          than carrying the last one's text — see the note in ComposeDialog. */}
      {compose && (
        <ComposeDialog
          key={`${compose.threadId ?? "new"}:${compose.to}`}
          onClose={() => setCompose(null)}
          initialTo={compose.to}
          initialSubject={compose.subject}
          threadId={compose.threadId}
          replyingTo={compose.to || null}
        />
      )}
    </div>
  );
}

// --- The list ---------------------------------------------------------------

function MessageList({
  state,
  bucket,
  selectedId,
  onSelect,
  onReply,
  onLoadMore,
}: {
  state: ReturnType<typeof useInbox>;
  bucket: InboxBucket;
  selectedId: string | null;
  onSelect: (message: InboxMessage) => void;
  onReply: (message: InboxMessage) => void;
  onLoadMore: () => void;
}) {
  const messages = state.data?.messages ?? [];

  return (
    <div className="flex min-h-0 min-w-0 flex-col border-border lg:border-r">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.isError && (
          <div
            role="alert"
            className="m-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive"
          >
            {isMailboxReauthError(state.error)
              ? "The Gmail connection has expired. Reconnect it in Settings → Supplier Mail."
              : "Could not read the mailbox just now. Try Refresh."}
          </div>
        )}

        {!state.isPending && !state.isError && messages.length === 0 && (
          <div className="p-10 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-secondary/60">
              <InboxIcon className="size-5 text-muted-foreground/70" />
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {bucket === "unsorted"
                ? "Nothing waiting to be sorted."
                : bucket === "filtered"
                  ? "Nothing was filtered out of this page."
                  : "No business mail on this page."}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {state.data?.next_page_token
                ? "There is more mail further back — load the next page."
                : "That is the whole inbox."}
            </p>
            {state.data?.next_page_token && (
              <Button variant="outline" className="mt-4" onClick={onLoadMore}>
                Load older mail
              </Button>
            )}
          </div>
        )}

        {messages.length > 0 && (
          <ul className="divide-y divide-border/70">
            {messages.map((message) => (
              <MessageRow
                key={message.message_id}
                message={message}
                selected={message.message_id === selectedId}
                onSelect={() => onSelect(message)}
                onReply={() => onReply(message)}
              />
            ))}
          </ul>
        )}

        {messages.length > 0 && state.data?.next_page_token && (
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={onLoadMore}
              disabled={state.isFetching}
            >
              {state.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Load older mail"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Said plainly, because a count that looks like a total and is not one
          is worse than no count. Gmail cannot report how many messages match a
          query without walking every one of them. */}
      {!state.isPending && !state.isError && (
        <p className="shrink-0 border-t border-border bg-secondary/20 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          Counts describe the {state.data?.scanned ?? 0} messages read for this
          page, not the whole mailbox.
        </p>
      )}
    </div>
  );
}

function MessageRow({
  message,
  selected,
  onSelect,
  onReply,
}: {
  message: InboxMessage;
  selected: boolean;
  onSelect: () => void;
  onReply: () => void;
}) {
  const sender = message.from_name || message.from_address || "Unknown sender";
  const unread = message.is_unread;

  return (
    <li
      className={cn(
        "group relative transition-colors",
        selected
          ? "bg-primary/[0.07]"
          : unread
            ? "bg-card hover:bg-accent/40"
            : "bg-secondary/[0.18] hover:bg-accent/40",
      )}
    >
      {/* The selected row is marked on its edge rather than with a border box,
          so selection never changes the row's height or the column grid. */}
      {selected && (
        <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
      )}

      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onReply}
        aria-current={selected}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
      >
        <Avatar name={sender} address={message.from_address} muted={!unread} />

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span
              className={cn(
                "truncate text-[13px] text-foreground",
                unread ? "font-bold" : "font-semibold",
              )}
            >
              {sender}
            </span>

            {message.has_attachments && (
              <Paperclip className="size-3 shrink-0 text-muted-foreground" />
            )}

            {/* Time and the hover actions occupy the same slot, so the row does
                not reflow when the cursor lands on it. */}
            <span className="ml-auto shrink-0 pl-1">
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground group-hover:invisible group-focus-within:invisible">
                {formatWhen(message.received_at)}
              </span>
              <span className="invisible absolute right-2 top-1.5 group-hover:visible group-focus-within:visible">
                <RowActions message={message} onReply={onReply} />
              </span>
            </span>
          </span>

          <span
            className={cn(
              "mt-0.5 block truncate text-[13px]",
              unread
                ? "font-semibold text-foreground"
                : "font-medium text-foreground/80",
            )}
          >
            {message.subject || "(no subject)"}
          </span>

          {message.snippet && (
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {message.snippet}
            </span>
          )}

          {/* Property 3: the verdict is never hidden. Kept as a quiet line
              rather than a badge so a screen of mail is not a screen of
              pills — but always on the row, never behind a hover. */}
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="truncate text-[11px] font-medium text-muted-foreground"
              title="Why this message was sorted here"
            >
              {message.bucket_reason}
            </span>
            {message.company_name && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-semibold"
              >
                <Building2 className="mr-1 size-2.5" />
                {message.company_name}
              </Badge>
            )}
            {message.in_erp && (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[10px] font-semibold"
              >
                <CheckCircle2 className="mr-1 size-2.5" />
                Tracked
              </Badge>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Reply plus the triage rule, shown in the timestamp's place on hover. */
function RowActions({
  message,
  onReply,
}: {
  message: InboxMessage;
  onReply: () => void;
}) {
  return (
    <span className="flex items-center gap-0.5 rounded-lg bg-card/95 p-0.5 shadow-xs ring-1 ring-border/70 backdrop-blur-sm">
      <span
        role="button"
        tabIndex={0}
        title="Reply to this message"
        onClick={(event) => {
          event.stopPropagation();
          onReply();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onReply();
          }
        }}
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Reply className="size-3.5" />
      </span>
      <TriageButtons message={message} />
    </span>
  );
}

/**
 * The learning loop, and the reason no AI is involved.
 *
 * One press writes a permanent rule keyed on the sender's address, or on their
 * whole domain when that is safe. Everything from that sender is sorted the
 * same way afterwards, so Unsorted empties out over the first few weeks
 * instead of asking the same question forever.
 *
 * The domain button is hidden on free mail providers. Allowing "everyone at
 * qq.com" would allowlist every QQ user alive — and a fair number of the
 * client's factory contacts write from exactly there, so the rule meant to
 * surface one supplier would bury him in strangers. The server refuses it too;
 * this only keeps the buyer from being offered a button that cannot work.
 */
function TriageButtons({ message }: { message: InboxMessage }) {
  const setRule = useSetSenderRule();
  const address = message.from_address;
  if (!address) return null;

  const domain = address.split("@")[1] ?? "";
  const domainOffered = domain && !FREEMAIL.has(domain);
  const markingBusiness = message.bucket !== "business";

  const press = (event: React.SyntheticEvent, run: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    run();
  };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-disabled={setRule.isPending}
        title={
          markingBusiness
            ? `Always show mail from ${address} under Business`
            : `Stop showing mail from ${address}`
        }
        onClick={(event) =>
          press(event, () =>
            setRule.mutate({
              pattern: address,
              is_domain: false,
              is_business: markingBusiness,
              company_id: message.company_id,
            }),
          )
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            press(event, () =>
              setRule.mutate({
                pattern: address,
                is_domain: false,
                is_business: markingBusiness,
                company_id: message.company_id,
              }),
            );
          }
        }}
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {markingBusiness ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <Ban className="size-3.5" />
        )}
      </span>

      {domainOffered && markingBusiness && (
        <span
          role="button"
          tabIndex={0}
          aria-disabled={setRule.isPending}
          title={`Trust everyone at ${domain} — use this for a supplier's own company domain`}
          onClick={(event) =>
            press(event, () =>
              setRule.mutate({
                pattern: domain,
                is_domain: true,
                is_business: true,
                company_id: message.company_id,
              }),
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              press(event, () =>
                setRule.mutate({
                  pattern: domain,
                  is_domain: true,
                  is_business: true,
                  company_id: message.company_id,
                }),
              );
            }
          }}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ShieldQuestion className="size-3.5" />
        </span>
      )}
    </>
  );
}

// --- The reader -------------------------------------------------------------

function ThreadPanel({
  message,
  onClose,
  onReply,
}: {
  message: InboxMessage | null;
  onClose: () => void;
  onReply: (message: InboxMessage) => void;
}) {
  const thread = useInboxThread(message?.thread_id ?? null);
  const file = useFileInboxThread();

  if (!message) {
    return (
      <div className="hidden min-h-0 flex-col items-center justify-center bg-secondary/15 p-10 text-center lg:flex">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-card shadow-xs ring-1 ring-border">
          <Mail className="size-6 text-muted-foreground/60" />
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">
          Select a message to read it
        </p>
        <p className="mt-1 max-w-xs text-xs font-medium text-muted-foreground">
          Opening a message does not save it. Replying or filing it does.
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Key>j</Key>
          <Key>k</Key>
          to move
          <span className="mx-1 text-border">·</span>
          <Key>r</Key>
          to reply
        </p>
      </div>
    );
  }

  const subject = baseSubject(message.subject) || "(no subject)";
  const messages = [...(thread.data?.messages ?? [])].sort((a, b) =>
    byNewest(a.occurred_at, b.occurred_at),
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-col bg-secondary/10">
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold tracking-tight text-foreground">
              {subject}
            </h2>
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
              {message.from_name
                ? `${message.from_name} · ${message.from_address}`
                : message.from_address}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close this conversation (Esc)"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => onReply(message)}>
            <Reply className="size-3.5" />
            Reply
          </Button>
          {!message.in_erp && (
            <Button
              variant="outline"
              size="sm"
              disabled={file.isPending}
              title="Keep this conversation in the ERP, on the supplier's timeline"
              onClick={() =>
                file.mutate({
                  threadId: message.thread_id,
                  companyId: message.company_id,
                })
              }
            >
              {file.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Archive className="size-3.5" />
              )}
              File to ERP
            </Button>
          )}
          {message.in_erp && (
            <Badge variant="success" className="px-2 py-0.5 text-[10px]">
              <CheckCircle2 className="mr-1 size-3" />
              Tracked in the ERP
            </Badge>
          )}
          {message.company_name && (
            <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
              <Building2 className="mr-1 size-3" />
              {message.company_name}
            </Badge>
          )}
          <span className="ml-auto text-[11px] font-medium text-muted-foreground">
            {messages.length > 0 &&
              `${messages.length} message${messages.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {thread.isPending && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading conversation…
          </div>
        )}

        {thread.isError && (
          <p className="text-sm font-medium text-destructive">
            {isMailboxReauthError(thread.error)
              ? "The Gmail connection has expired. Reconnect it in Settings → Supplier Mail."
              : "Could not open this conversation."}
          </p>
        )}

        {/* Newest first, same as the sourcing thread view: what the reader came
            for is the latest message, not a scroll through their own sent mail
            to reach it. */}
        {messages.map((item) => (
          <MessageBubble key={item.message_id} item={item} />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  item,
}: {
  item: NonNullable<ReturnType<typeof useInboxThread>["data"]>["messages"][number];
}) {
  const [showQuoted, setShowQuoted] = useState(false);
  const { reply, quoted } = splitQuotedReply(item.body);
  const files = item.attachments.filter((a) => !a.is_inline);
  const outbound = item.direction === "outbound";
  const who = outbound ? "You" : item.from_name || item.from_address || "Sender";

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3.5 shadow-xs",
        outbound ? "border-primary/25 bg-primary/[0.04]" : "border-border",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={who} address={item.from_address} small />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-foreground">{who}</p>
          {!outbound && item.from_name && item.from_address && (
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {item.from_address}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
          {formatWhen(item.occurred_at)}
        </span>
      </div>

      <p className="mt-2.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
        {reply || "(no text content)"}
      </p>

      {/* Gmail hides the quoted tail behind a "…" that is impossible to aim at.
          A named control is the same idea with a target you can hit. */}
      {quoted && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowQuoted((open) => !open)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                showQuoted && "rotate-180",
              )}
            />
            {showQuoted ? "Hide quoted text" : "Show quoted text"}
          </button>
          {showQuoted && (
            <pre className="mt-1.5 max-h-64 overflow-auto whitespace-pre-wrap border-l-2 border-border pl-3 font-sans text-[12px] leading-relaxed text-muted-foreground">
              {quoted}
            </pre>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
          {files.map((attachment) => (
            <button
              key={attachment.part_id}
              type="button"
              onClick={() =>
                downloadInboxAttachment(
                  item.message_id,
                  attachment.part_id,
                  attachment.filename,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <Paperclip className="size-3 text-muted-foreground" />
              {attachment.filename}
              <Download className="size-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

// --- Helpers ----------------------------------------------------------------

/** A sender's initials on a colour derived from their address.
 *
 *  The colour is decorative only — the initials and the name carry the
 *  identity, so nothing here depends on telling two hues apart (the palette is
 *  not built for that, see the note on the tile tokens). */
function Avatar({
  name,
  address,
  small = false,
  muted = false,
}: {
  name: string;
  address?: string | null;
  small?: boolean;
  muted?: boolean;
}) {
  const initials = initialsOf(name);
  const tone = AVATAR_TONES[hashOf(address || name) % AVATAR_TONES.length];

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold uppercase",
        small ? "size-7 text-[10px]" : "size-9 text-[11px]",
        tone,
        muted && "opacity-85",
      )}
    >
      {initials}
    </span>
  );
}

const AVATAR_TONES = [
  "bg-tile-blue-bg text-tile-blue",
  "bg-tile-green-bg text-tile-green",
  "bg-tile-purple-bg text-tile-purple",
  "bg-tile-amber-bg text-tile-amber",
  "bg-tile-teal-bg text-tile-teal",
  "bg-tile-rose-bg text-tile-rose",
];

function initialsOf(name: string): string {
  const cleaned = name.replace(/["']/g, "").trim();
  if (!cleaned) return "?";
  // An address with no display name reads better as its first letter than as
  // two letters cut out of a domain.
  if (cleaned.includes("@") && !cleaned.includes(" ")) {
    return cleaned[0] ?? "?";
  }
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`;
}

function hashOf(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-bold text-foreground shadow-xs">
      {children}
    </kbd>
  );
}

/** Mirrors `mail_filter.FREEMAIL_DOMAINS` closely enough to decide whether to
 *  *offer* a domain rule. The server holds the authoritative list and refuses
 *  the rest; this only avoids showing a button that would be rejected. */
const FREEMAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "qq.com",
  "foxmail.com",
  "163.com",
  "126.com",
  "sina.com",
  "sohu.com",
  "aliyun.com",
  "naver.com",
  "daum.net",
]);

function formatWhen(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
