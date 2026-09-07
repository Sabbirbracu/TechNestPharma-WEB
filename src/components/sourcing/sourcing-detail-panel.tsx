"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  NotebookPen,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  downloadDocument,
  useChangeSourcingStatus,
  useDocuments,
  useMailboxSettings,
  useSourcingRequest,
} from "@/lib/queries";
import { docTypeMeta, formatBytes, typeChip } from "@/components/documents/doc-taxonomy";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { ComposeDialog } from "@/components/inbox/compose-dialog";
import {
  MailThread,
  type ThreadReplyContext,
} from "@/components/mailbox/mail-thread";
import { byNewest, cn } from "@/lib/utils";
import {
  CHANNEL_LABELS,
  STATUS_OPTIONS,
  STATUS_STYLES,
  dueIn,
  formatDate,
  formatDateTime,
  priceBand,
  referenceOf,
  relativeTime,
} from "./sourcing-taxonomy";
import type {
  Communication,
  Quotation,
  SourcingRequestDetail,
  SourcingRequestListItem,
  StatusHistoryEntry,
} from "@/types/api";

type Tab = "mail" | "quotations" | "timeline" | "communications" | "documents";

const TABS: { key: Tab; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "mail", label: "Conversation" },
  { key: "quotations", label: "Quotations" },
  { key: "communications", label: "Other Channels" },
  { key: "documents", label: "Documents" },
];

/**
 * One enquiry, as a workspace rather than a slot.
 *
 * The old panel was a 672px column: request facts stacked above a tab strip,
 * with the conversation reading through a letterbox and the primary actions
 * pinned to a footer three scrolls away from anything. At 85% of the viewport
 * there is room to stop stacking, so the two things a buyer needs at once sit
 * side by side — what was asked for on the left, what came back on the right.
 *
 * Timeline is the landing tab (client request, 2026-08-30). It answers "where
 * does this enquiry stand" in one screen — status moves and messages in one
 * column — and every row on it is a link into the tab holding the detail, so
 * Conversation is one click away rather than the thing you land in.
 */
export function SourcingDetailPanel({
  request,
  onClose,
}: {
  request: SourcingRequestListItem;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("timeline");
  const [composing, setComposing] = useState(false);
  // A reply into the conversation that already exists, as opposed to
  // `composing`, which is the enquiry composer. Two states rather than one
  // because they are genuinely different jobs — see the note by the dialogs.
  const [replying, setReplying] = useState<ThreadReplyContext | null>(null);
  const { data, isPending } = useSourcingRequest(request.id);
  const { data: mailbox } = useMailboxSettings();

  // The list row renders immediately; children fill in when the detail lands.
  const detail = data;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const sendLabel = request.sent_at ? "Send Follow-up" : "Send Inquiry";
  const sendBlockedReason = mailbox?.can_send
    ? undefined
    : mailbox?.account?.status === "needs_reauth"
      ? "The Gmail connection expired — reconnect it in Settings → Supplier Mail"
      : "Connect a Gmail account in Settings → Supplier Mail";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Sourcing enquiry for ${request.product.name_en}`}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-xl sm:h-[88vh] sm:w-[85vw] sm:max-w-[85vw] sm:rounded-2xl">
        <header className="flex shrink-0 flex-col gap-4 border-b border-border/60 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground">
                {request.product.name_en}
              </h2>
              <StatusMenu request={request} />
            </div>
            {/* One line of identity under the title, so the header answers
                "which enquiry is this" without spending a facts grid on it —
                the grid moved to the rail, where it can be read alongside the
                conversation instead of above it. */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
              <span className="font-mono font-semibold">{referenceOf(request)}</span>
              <Separator />
              <Link
                href={`/companies/${request.company.id}`}
                className="font-semibold text-foreground transition-colors hover:text-primary"
              >
                {request.company.name_en}
              </Link>
              <Separator />
              <span>Last activity {relativeTime(request.last_activity_at)}</span>
              {request.awaiting_us && (
                <>
                  <Separator />
                  <span className="flex items-center gap-1.5 font-semibold text-success">
                    <span className="size-1.5 rounded-full bg-success" />
                    Awaiting your reply
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions live in the header now. As a footer bar they sat below a
              scrolling region, so the button that does the main job of this
              screen was the one thing you could scroll away from. */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              onClick={() => setComposing(true)}
              disabled={!mailbox?.can_send}
              title={sendBlockedReason}
            >
              <Send strokeWidth={2.25} />
              {sendLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled
              title="Notes are not editable from the panel yet"
            >
              <NotebookPen strokeWidth={2.25} />
              Add Note
            </Button>
            <IconButton
              label="Watchlist this enquiry"
              disabled
              title="Watchlisting is not available yet"
            >
              <Bookmark className="size-4" strokeWidth={2.25} />
            </IconButton>
            <PanelMenu request={request} />
            <IconButton label="Close" onClick={onClose}>
              <X className="size-4" strokeWidth={2.25} />
            </IconButton>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <RequestRail request={request} detail={detail} />

          <section className="flex min-w-0 flex-1 flex-col">
            <nav
              aria-label="Enquiry detail"
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 px-4"
            >
              {TABS.map((entry) => (
                <TabButton
                  key={entry.key}
                  active={tab === entry.key}
                  onClick={() => setTab(entry.key)}
                >
                  {entry.label}
                  {entry.key === "quotations" &&
                    ` (${detail?.quotations.length ?? request.quotation_count})`}
                  {entry.key === "communications" &&
                    ` (${
                      detail
                        ? detail.communications.filter(
                            (item) => item.channel !== "email",
                          ).length
                        : 0
                    })`}
                </TabButton>
              ))}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {isPending ? (
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading the full record…
                </div>
              ) : !detail ? (
                <p className="text-sm font-medium text-muted-foreground">
                  Could not load this enquiry.
                </p>
              ) : tab === "mail" ? (
                <MailThread
                  requestId={request.id}
                  companyId={request.company?.id ?? null}
                  requestLabel={request.product?.name_en ?? null}
                  onReply={(context) =>
                    context ? setReplying(context) : setComposing(true)
                  }
                />
              ) : tab === "timeline" ? (
                <Timeline detail={detail} onOpenTab={setTab} />
              ) : tab === "communications" ? (
                <Communications
                  items={detail.communications.filter(
                    (item) => item.channel !== "email",
                  )}
                />
              ) : tab === "quotations" ? (
                <Quotations items={detail.quotations} />
              ) : (
                <Documents requestId={request.id} />
              )}
            </div>
          </section>
        </div>
      </div>

      {/* The same dialog the tender board opens, on a request that already
          exists — checklist, live server-rendered preview and all. Sourcing
          used to have a compose box of its own, which meant the email a
          supplier got depended on which screen the buyer started from. */}
      {composing && detail && (
        <EnquiryDialog
          open
          mode={{ kind: "existing", requestId: request.id }}
          productId={request.product.id}
          productName={request.product.name_en}
          targets={[
            {
              key: request.id,
              companyId: request.company.id,
              companyName: request.company.name_en,
              // The sourcing list row does not carry the supplier's country,
              // and it is only a subtitle on the card — the dialog reads it
              // for display, never for the email.
              country: null,
              specification: detail.required_specification,
              packing: detail.required_packing,
              supplierProductId: detail.supplier_product_id,
              contactPersonId: request.contact_person?.id ?? null,
            },
          ]}
          initialQuantity={request.required_quantity}
          initialQuantityUnit={request.quantity_unit}
          initialAsks={detail.required_documents}
          onClose={() => setComposing(false)}
          onCreated={() => {
            setComposing(false);
            setTab("mail");
          }}
        />
      )}
      {/* Replying uses the inbox's composer, not the enquiry dialog above.
          They answer different questions: an enquiry is a checklist the
          supplier has to work through, and the dialog exists to keep that
          identical wherever it is sent from. A reply is a message into a
          conversation that is already running — the same job the inbox does,
          so it is the same dialog, and `threadId` is what keeps the answer in
          the supplier's existing Gmail thread rather than starting a new one.

          Keyed on the thread so each reply opens empty; see ComposeDialog. */}
      {replying && (
        <ComposeDialog
          key={replying.threadId}
          onClose={() => setReplying(null)}
          initialTo={replying.to}
          initialSubject={replying.subject}
          threadId={replying.threadId}
          replyingTo={replying.to}
          requestId={request.id}
        />
      )}
    </div>,
    document.body,
  );
}

/**
 * What was asked for, down the left.
 *
 * A fixed rail rather than a header grid: these are the numbers a buyer checks
 * *against* the reply they are reading — "did they quote the quantity we
 * asked for" — and facts you have to scroll away from to read the answer are
 * facts you end up re-opening the enquiry for.
 */
function RequestRail({
  request,
  detail,
}: {
  request: SourcingRequestListItem;
  detail: SourcingRequestDetail | undefined;
}) {
  const due = dueIn(request.follow_up_on);
  const target = priceBand(
    request.target_price_min,
    request.target_price_max,
    request.target_currency,
    request.target_price_unit,
  );

  return (
    <aside className="shrink-0 overflow-y-auto border-b border-border/60 bg-secondary/20 p-5 lg:w-[300px] lg:border-b-0 lg:border-r xl:w-[340px]">
      <RailSection title="Request">
        <Fact label="CAS No.">
          {request.product.cas_number ? (
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {request.product.cas_number}
            </span>
          ) : (
            <NotAvailable />
          )}
        </Fact>
        <Fact label="Requested Quantity">
          {request.required_quantity ? (
            <span className="text-sm font-semibold text-foreground">
              {trimNumber(request.required_quantity)} {request.quantity_unit ?? ""}
            </span>
          ) : (
            <NotAvailable />
          )}
        </Fact>
        <Fact label="Target Price">
          {target ? (
            <span className="text-sm font-semibold text-foreground">{target}</span>
          ) : (
            <NotAvailable />
          )}
        </Fact>
        <Fact label="Specification">
          {detail?.required_specification ? (
            <span className="text-sm font-medium text-foreground">
              {detail.required_specification}
            </span>
          ) : (
            <NotAvailable />
          )}
        </Fact>
        <Fact label="Packing">
          {detail?.required_packing ? (
            <span className="text-sm font-medium text-foreground">
              {detail.required_packing}
            </span>
          ) : (
            <NotAvailable />
          )}
        </Fact>
        <Fact label="Documents Asked For">
          {detail?.required_documents && detail.required_documents.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.required_documents.map((document) => (
                <span
                  key={document}
                  className="rounded-md bg-card px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-foreground ring-1 ring-inset ring-border/60"
                >
                  {document}
                </span>
              ))}
            </div>
          ) : (
            <NotAvailable />
          )}
        </Fact>
      </RailSection>

      <RailSection title="Context">
        <Fact label="Supplier">
          <Link
            href={`/companies/${request.company.id}`}
            className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
            title={request.company.name_en}
          >
            {request.company.name_en}
          </Link>
          {request.contact_person && (
            <span className="block truncate text-xs font-medium text-muted-foreground">
              {request.contact_person.name_en}
              {request.contact_person.designation
                ? ` · ${request.contact_person.designation}`
                : ""}
            </span>
          )}
        </Fact>
        <Fact label="Related To">
          {request.tender ? (
            <Link
              href={`/tenders/${request.tender.id}`}
              className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              {request.tender.reference_no ?? `Tender #${request.tender.id}`}
              <span className="block truncate text-xs font-medium text-muted-foreground">
                {request.tender.name}
              </span>
            </Link>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              Speculative enquiry
            </span>
          )}
        </Fact>
        <Fact label="Follow-up">
          {due ? (
            <>
              <span className="text-sm font-semibold text-foreground">
                {formatDate(request.follow_up_on)}
              </span>
              <span
                className={cn(
                  "block text-xs font-semibold",
                  due.overdue ? "text-destructive" : "text-tile-amber",
                )}
              >
                {due.text}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground/70">
              None set
            </span>
          )}
        </Fact>
      </RailSection>

      {detail?.notes && (
        <RailSection title="Internal Notes">
          {/* Ours, not the supplier's — never sent, and worth keeping visually
              distinct from everything above it that was. */}
          <p className="whitespace-pre-wrap rounded-xl bg-tile-amber-bg/60 p-3 text-xs font-medium leading-relaxed text-foreground ring-1 ring-inset ring-tile-amber/15">
            {detail.notes}
          </p>
        </RailSection>
      )}
    </aside>
  );
}

function RailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 last:mb-0">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Separator() {
  return <span aria-hidden className="text-border">·</span>;
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The status history and the exchanges, interleaved into one story.
 *
 * They are separate tables — a status change is not a message — but a reader
 * asking "what happened here" wants them in one column, in order.
 *
 * Newest first, matching Conversation. This is the landing tab, so the row a
 * buyer opens the enquiry to see — the latest reply, the status it just moved
 * to — has to be the row they land on, not the one at the bottom of a scroll.
 * The follow-up that is still owed sits above even that: it is the future, and
 * on a newest-first axis the future is the top.
 */
function Timeline({
  detail,
  onOpenTab,
}: {
  detail: SourcingRequestDetail;
  onOpenTab: (tab: Tab) => void;
}) {
  const entries = [
    ...detail.history.map((entry) => ({
      key: `h-${entry.id}`,
      at: entry.changed_at,
      title: historyTitle(entry),
      meta: entry.note ?? null,
      dot: STATUS_STYLES[entry.to_status].dot,
      // A move to "quotation received" is the one status change with something
      // to look at behind it.
      tab:
        entry.to_status === "quotation_received" && detail.quotations.length > 0
          ? ("quotations" as Tab)
          : null,
      actionLabel: "View Quotation",
    })),
    ...detail.communications.map((entry) => ({
      key: `c-${entry.id}`,
      at: entry.occurred_at,
      title:
        entry.direction === "outbound"
          ? `${CHANNEL_LABELS[entry.channel]} sent`
          : `${CHANNEL_LABELS[entry.channel]} received`,
      meta: entry.counterparty ?? entry.subject ?? null,
      dot:
        entry.direction === "outbound" ? "bg-tile-blue" : "bg-tile-green",
      // Email lives in Conversation; Other Channels filters it out, so
      // sending an email row there opened a tab that could not show it.
      tab: (entry.channel === "email" ? "mail" : "communications") as Tab,
      actionLabel:
        entry.channel === "email" ? "View Email" : "View Message",
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const due = dueIn(detail.follow_up_on);

  return (
    // Time down a gutter of its own, events in a column beside it. In the
    // narrow panel the timestamp was a third line under each entry, which
    // made "when did this happen" the last thing you read instead of the
    // axis the list is organised on.
    <ol className="relative">
      {/* The one forward-looking row: what is owed next, not what happened.
          Hollow dot, because it has not occurred yet. */}
      {due && (
        <li className="flex gap-4">
          <div className="hidden w-36 shrink-0 pt-0.5 text-right sm:block">
            <p className="text-xs font-semibold text-foreground">
              {formatDate(detail.follow_up_on)}
            </p>
            <p
              className={cn(
                "text-xs font-semibold",
                due.overdue ? "text-destructive" : "text-tile-amber",
              )}
            >
              {due.text}
            </p>
          </div>
          <div className="relative flex w-4 shrink-0 justify-center">
            <span
              aria-hidden
              className="z-10 mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-tile-amber bg-card ring-4 ring-card"
            />
            {entries.length > 0 && (
              <span
                aria-hidden
                className="absolute inset-y-0 top-4 w-px bg-border"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-6">
            <p className="text-sm font-semibold text-foreground">Follow-up due</p>
            <p className="text-xs font-medium text-muted-foreground">
              Send a follow-up to the supplier
            </p>
          </div>
        </li>
      )}

      {entries.map((entry, index) => (
        <li key={entry.key} className="flex gap-4">
          <div className="hidden w-36 shrink-0 pt-0.5 text-right sm:block">
            <p className="text-xs font-semibold text-foreground">
              {formatDate(entry.at)}
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              {new Date(entry.at).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* The rail: a dot per event, joined by a line that stops at the
              oldest one rather than trailing off the end of the list. */}
          <div className="relative flex w-4 shrink-0 justify-center">
            <span
              aria-hidden
              className={cn(
                "z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-card",
                entry.dot,
              )}
            />
            {index < entries.length - 1 && (
              <span
                aria-hidden
                className="absolute inset-y-0 top-4 w-px bg-border"
              />
            )}
          </div>

          <div className="min-w-0 flex-1 pb-6">
            <p className="text-sm font-semibold text-foreground">{entry.title}</p>
            {entry.meta && (
              <p className="truncate text-xs font-medium text-muted-foreground">
                {entry.meta}
              </p>
            )}
            <p className="text-xs font-medium text-muted-foreground sm:hidden">
              {formatDateTime(entry.at)}
            </p>
          </div>

          {entry.tab && (
            <button
              type="button"
              onClick={() => onOpenTab(entry.tab as Tab)}
              className="h-fit shrink-0 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {entry.actionLabel}
            </button>
          )}
        </li>
      ))}

    </ol>
  );
}

/**
 * Everything that was not email.
 *
 * Split out from the conversation tab rather than mixed into it: a phone call
 * and a Gmail thread are the same row in `communication`, but they are not the
 * same thing to read — one is a log entry someone typed, the other is a
 * message with a body and attachments.
 */
function Communications({ items }: { items: Communication[] }) {
  const sorted = [...items].sort((a, b) =>
    byNewest(a.occurred_at, b.occurred_at),
  );

  return (
    <div className="space-y-4">
      <RoadmapNotice />

      {sorted.length === 0 ? (
        <EmptyTab
          icon={MessageSquare}
          title="Nothing logged off email"
          body="Log a call, a meeting, or a WhatsApp message and it appears here and on the timeline. Email lives in Conversation."
        />
      ) : (
        <CommunicationList items={sorted} />
      )}
    </div>
  );
}

/**
 * What this tab will be, said plainly while it is not that yet.
 *
 * A tab that shows only hand-typed log entries reads as broken to someone who
 * expected their WhatsApp thread in it — and this desk does a great deal of
 * business on WhatsApp and WeChat. Naming the gap, and naming it as a decision
 * rather than an omission, is the difference between "not built" and "does not
 * work".
 */
function RoadmapNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
        <Sparkles className="size-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 space-y-1">
        <p className="text-[13px] font-bold text-foreground">
          Messaging apps are not connected yet
        </p>
        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
          WhatsApp, WeChat and Messenger can be integrated so their threads
          appear here beside email, the same way Gmail already does. Until then
          this tab holds what has been logged by hand — calls, meetings, and
          messages someone typed up.
        </p>
        <p className="flex items-center gap-1.5 pt-0.5 text-[11px] font-semibold text-muted-foreground">
          <MessageCircle className="size-3.5" strokeWidth={2.2} />
          Ask to have it built when you want it.
        </p>
      </div>
    </div>
  );
}

function CommunicationList({ items: sorted }: { items: Communication[] }) {
  return (
    <ul className="space-y-2.5">
      {sorted.map((item) => (
        <li
          key={item.id}
          className="rounded-xl border border-border/60 p-4 transition-colors hover:border-border"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                item.direction === "outbound"
                  ? "bg-tile-blue-bg text-tile-blue ring-tile-blue/20"
                  : "bg-tile-green-bg text-tile-green ring-tile-green/20",
              )}
            >
              {item.direction === "outbound" ? "Sent" : "Received"}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {CHANNEL_LABELS[item.channel]}
            </span>
            {item.counterparty && (
              <>
                <Separator />
                <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                  {item.counterparty}
                </span>
              </>
            )}
            {item.has_attachments && (
              <Paperclip
                className="size-3.5 text-muted-foreground"
                aria-label="Has attachments"
              />
            )}
            <span className="ml-auto shrink-0 text-xs font-medium text-muted-foreground">
              {formatDateTime(item.occurred_at)}
            </span>
          </div>

          {item.subject && (
            <p className="mt-2 text-sm font-semibold text-foreground">
              {item.subject}
            </p>
          )}
          {item.body && (
            // Room to show the note rather than three clamped lines of it —
            // a logged call is usually short, and truncating it hid the point.
            <p className="mt-1 max-w-3xl whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * What came back, as a table.
 *
 * Cards worked in a 672px column because only one field fitted per line.
 * With the width to lay the fields out in columns, a table is the better
 * shape: a supplier who requotes is the normal case, and comparing two
 * quotations means reading down a column, not across two cards.
 */
function Quotations({ items }: { items: Quotation[] }) {
  if (items.length === 0) {
    return (
      <EmptyTab
        icon={FileText}
        title="No quotations recorded"
        body="Record what the supplier quoted and the enquiry moves to Quotation Received."
      />
    );
  }

  // Newest first, matching the conversation beside it.
  const sorted = [...items].sort((a, b) => b.quoted_on.localeCompare(a.quoted_on));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/40">
              <QuoteHeader>Quoted</QuoteHeader>
              <QuoteHeader>Price</QuoteHeader>
              <QuoteHeader>MOQ</QuoteHeader>
              <QuoteHeader>Lead Time</QuoteHeader>
              <QuoteHeader>Incoterm</QuoteHeader>
              <QuoteHeader>Packing</QuoteHeader>
              <QuoteHeader>Valid Until</QuoteHeader>
            </tr>
          </thead>
          <tbody>
            {sorted.map((quotation) => {
              const expired =
                quotation.valid_until !== null &&
                new Date(`${quotation.valid_until}T23:59:59`) < new Date();

              return (
                <tr
                  key={quotation.id}
                  className="border-b border-border/40 last:border-b-0"
                >
                  <QuoteCell>{formatDate(quotation.quoted_on)}</QuoteCell>
                  <td className="px-3 py-3">
                    <span className="text-sm font-bold tracking-tight text-foreground">
                      {priceBand(
                        quotation.price_min,
                        quotation.price_max,
                        quotation.currency,
                        quotation.price_unit,
                      ) ?? "No price quoted"}
                    </span>
                  </td>
                  <QuoteCell>
                    {quotation.moq
                      ? `${trimNumber(quotation.moq)} ${quotation.moq_unit ?? ""}`.trim()
                      : null}
                  </QuoteCell>
                  <QuoteCell>
                    {quotation.lead_time_days !== null
                      ? `${quotation.lead_time_days} days`
                      : null}
                  </QuoteCell>
                  <QuoteCell>{quotation.incoterm}</QuoteCell>
                  <QuoteCell>{quotation.packing}</QuoteCell>
                  <td className="px-3 py-3">
                    {quotation.valid_until ? (
                      <span
                        className={cn(
                          "text-[13px] font-semibold",
                          // An expired quote is not a comparable one, and a
                          // buyer reading a price needs to know before they
                          // act on it, not after.
                          expired ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {formatDate(quotation.valid_until)}
                        {expired && (
                          <span className="block text-xs font-medium">Expired</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[13px] font-medium text-muted-foreground/60">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Specification and notes are prose and would wreck the column widths,
          so they sit under the table keyed by date. */}
      {sorted.some((quotation) => quotation.specification || quotation.notes) && (
        <dl className="space-y-3">
          {sorted
            .filter((quotation) => quotation.specification || quotation.notes)
            .map((quotation) => (
              <div
                key={quotation.id}
                className="rounded-xl border border-border/60 p-3.5"
              >
                <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {formatDate(quotation.quoted_on)}
                </dt>
                <dd className="mt-1 space-y-1">
                  {quotation.specification && (
                    <p className="text-[13px] font-medium text-foreground">
                      {quotation.specification}
                    </p>
                  )}
                  {quotation.notes && (
                    <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                      {quotation.notes}
                    </p>
                  )}
                </dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}

function QuoteHeader({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
    >
      {children}
    </th>
  );
}

function QuoteCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-3 text-[13px] font-medium text-foreground">
      {children || (
        <span className="font-medium text-muted-foreground/60">—</span>
      )}
    </td>
  );
}

/**
 * Every file this enquiry has, with the one fact a paperclip cannot carry:
 * which way it travelled.
 *
 * "Who sent this?" is the first question asked of a document on an enquiry,
 * and `source: email` cannot answer it — a COA the supplier attached and a
 * spec sheet we attached are the same value there. The direction comes off the
 * message the attachment hung on, resolved server-side (`mail_direction`).
 *
 * Supplier attachments arrive here on their own now: they are copied into the
 * library as the reply syncs (2026-09-07), rather than waiting for someone to
 * press Save on each one. Anything filed against the enquiry by hand shows up
 * in the same list, because this reads the library rather than the mailbox.
 */
function Documents({ requestId }: { requestId: number }) {
  const { data, isPending, error } = useDocuments({
    sourcing_request_id: requestId,
    size: 50,
  });
  const documents = data?.items ?? [];

  if (isPending) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading documents…
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex min-h-[200px] items-center justify-center gap-2 text-sm font-semibold text-destructive"
      >
        <AlertCircle className="size-4" />
        Documents could not be loaded.
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyTab
        icon={Paperclip}
        title="No documents on this enquiry yet"
        body="Anything the supplier attaches to a reply is filed here automatically. Files you attach to an enquiry, and anything filed against it by hand, appear here too."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {documents.map((document) => {
        const meta = docTypeMeta(document.doc_type);
        const inbound = document.mail_direction === "inbound";
        const outbound = document.mail_direction === "outbound";

        return (
          <li
            key={document.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 p-3.5 transition-colors hover:border-border"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-5" strokeWidth={2} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-foreground">
                  {document.title}
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset",
                    typeChip(document.doc_type),
                  )}
                >
                  {meta.label}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                {/* The label the tab exists for. Uploaded-by-hand documents get
                    the uploader's name instead — same question, different
                    answer. */}
                {inbound || outbound ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                      inbound
                        ? "bg-tile-green-bg text-tile-green ring-tile-green/20"
                        : "bg-tile-blue-bg text-tile-blue ring-tile-blue/20",
                    )}
                  >
                    {inbound ? (
                      <ArrowDownLeft className="size-3" strokeWidth={2.5} />
                    ) : (
                      <ArrowUpRight className="size-3" strokeWidth={2.5} />
                    )}
                    {inbound ? "From supplier" : "Sent by us"}
                  </span>
                ) : document.uploaded_by ? (
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Added by {document.uploaded_by}
                  </span>
                ) : null}

                <span className="text-[11px] font-medium text-muted-foreground">
                  {formatBytes(document.size_bytes)} ·{" "}
                  {formatDateTime(document.created_at)}
                </span>
              </div>
            </div>

            <button
              type="button"
              aria-label={`Download ${document.title}`}
              onClick={async () => {
                try {
                  await downloadDocument(document.id, document.title);
                } catch (downloadError) {
                  toast.error(
                    downloadError instanceof Error
                      ? downloadError.message
                      : "Could not download it.",
                  );
                }
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Download className="size-[18px]" strokeWidth={2} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

/** The status pill doubles as the control that moves the request. A separate
 *  "change status" button would put the state and the way to change it in two
 *  different places. */
function StatusMenu({ request }: { request: SourcingRequestListItem }) {
  const changeStatus = useChangeSourcingStatus();
  const status = STATUS_STYLES[request.status];

  return (
    <DropdownMenu
      align="start"
      trigger={(props) => (
        <button
          type="button"
          {...props}
          disabled={changeStatus.isPending}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60",
            status.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
          {changeStatus.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ChevronDown className="size-3" strokeWidth={2.5} />
          )}
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          {STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option}
              disabled={option === request.status}
              onClick={() => {
                close();
                changeStatus.mutate({ id: request.id, to_status: option });
              }}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  STATUS_STYLES[option].dot,
                )}
              />
              {STATUS_STYLES[option].label}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </DropdownMenu>
  );
}

function PanelMenu({ request }: { request: SourcingRequestListItem }) {
  return (
    <DropdownMenu
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label="More actions"
          className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <MoreVertical className="size-4" strokeWidth={2.25} />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard?.writeText(referenceOf(request));
              close();
            }}
          >
            Copy reference
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled title="Editing an enquiry is not built yet">
            Edit enquiry
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative whitespace-nowrap px-2.5 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active
          ? "text-primary after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-border hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

function EmptyTab({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground ring-1 ring-border/50">
        <Icon className="size-5" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="max-w-xs text-xs font-medium leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}

function NotAvailable() {
  return <span className="text-sm font-semibold text-muted-foreground/70">N/A</span>;
}

function historyTitle(entry: StatusHistoryEntry): string {
  if (entry.from_status === null) return "Enquiry created";
  return `Moved to ${STATUS_STYLES[entry.to_status].label}`;
}

/** Numerics arrive as "500.000"; the trailing zeros are storage precision. */
function trimNumber(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
