"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Loader2,
  MailSearch,
  MessagesSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Upload,
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
import { ApiError } from "@/lib/api";
import {
  downloadDocument,
  downloadMailAttachment,
  useChangeSourcingStatus,
  useDeleteQuotation,
  useDocuments,
  useEnquiry,
  useLinkDocument,
  useMailboxSettings,
  useReadEnquiryReplies,
  useSyncMailbox,
  useUploadDocument,
} from "@/lib/queries";
import { DOC_TYPES, docTypeMeta, typeChip } from "@/components/documents/doc-taxonomy";
import { flagFor } from "@/lib/search-facets";
import { cn } from "@/lib/utils";
import type {
  DocType,
  EnquiryDetail,
  EnquiryItem,
  EnquiryMessage,
  SourcingStatus,
} from "@/types/api";
import {
  ENQUIRY_STATE,
  ITEM_STATE,
  LINE_OUTCOME,
  formatDateTime,
  formatPrice,
  formatQuantity,
  tenderLabel,
} from "./enquiry-taxonomy";
import { NewEnquiryDialog } from "./new-enquiry-dialog";
import { QuotationDialog } from "./quotation-dialog";
import { QuotationReviewDialog, REVIEW_STATUS } from "./quotation-review-dialog";
import { SendEnquiryDialog } from "./send-enquiry-dialog";

/**
 * One supplier enquiry — the workspace (2026-09-17, redesigned 2026-09-21 to
 * the client's mockup).
 *
 * Top to bottom: who and where it stands (header + a five-step progress
 * strip), what was asked (Items requested), what came back (Quotation review),
 * the emails (Email & communication) and the files (Documents).
 *
 * Product statuses are dynamic: every supplier reply is read by AI against
 * the products asked, so a line moves to Quoted or Unavailable on its own,
 * and its figures land in Quotation review as Unchecked with a Review (match
 * with email) action.
 */
export function EnquiryWorkspace({ enquiryId }: { enquiryId: number }) {
  const { data, isPending, error } = useEnquiry(enquiryId);
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState<"enquiry" | "follow_up" | null>(null);
  const [quoting, setQuoting] = useState<EnquiryItem | null | "pick">(null);
  const [conversation, setConversation] = useState(false);
  const [reviewing, setReviewing] = useState<{ messageId: number; itemId?: number } | null>(null);
  const readReplies = useReadEnquiryReplies(enquiryId);
  const autoRead = useRef(false);

  // Replies from before the AI pipeline existed have no reading yet; the
  // first visit queues them for the background worker (it never reads inside
  // the request). Once per visit, and the page then polls while it works.
  const unread = data?.unread_replies ?? 0;
  const canRead = data?.reading_available ?? false;
  useEffect(() => {
    if (unread > 0 && canRead && !autoRead.current) {
      autoRead.current = true;
      readReplies.mutate(false);
    }
  }, [unread, canRead, readReplies]);

  if (isPending) {
    return (
      <div className="flex items-center gap-2 p-10 text-sm font-medium text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading enquiry…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href="/supplier-enquiries"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Supplier Enquiries
        </Link>
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertCircle className="size-4" />
          {error instanceof ApiError ? error.message : "This enquiry could not be loaded."}
        </p>
      </div>
    );
  }

  const pending = data.items.filter((item) => item.state === "pending");
  const waiting = data.items.filter(
    (item) => item.state === "requested" || item.state === "replied",
  );

  const reread = () =>
    readReplies.mutate(true, {
      onSuccess: (summary) =>
        toast.success(
          summary.queued
            ? `${summary.queued} repl${summary.queued === 1 ? "y" : "ies"} queued for AI reading`
            : "Nothing to re-read — reviewed replies are kept as they are",
        ),
      onError: (err) =>
        toast.error(err instanceof ApiError ? err.message : "Could not read the replies"),
    });

  return (
    <div className="space-y-5">
      <Breadcrumb name={data.supplier.name} />

      <Header
        enquiry={data}
        pendingCount={pending.length}
        reading={readReplies.isPending || data.processing_replies > 0}
        onSend={() => setSending(pending.length ? "enquiry" : "follow_up")}
        onAddProduct={() => setAdding(true)}
        onReread={reread}
      />

      <ProgressStrip enquiry={data} />

      <ItemsSection
        enquiry={data}
        reading={readReplies.isPending || data.processing_replies > 0}
        onAddProduct={() => setAdding(true)}
        onRecordQuote={(item) => setQuoting(item)}
        onOpenReply={(messageId) => setReviewing({ messageId })}
      />

      <QuotationsSection
        enquiry={data}
        onRecord={() => setQuoting("pick")}
        onReview={(messageId, itemId) => setReviewing({ messageId, itemId })}
      />

      <CommunicationSection
        enquiry={data}
        onOpenConversation={() => setConversation(true)}
        onMatch={(messageId) => setReviewing({ messageId })}
      />

      <DocumentsSection enquiry={data} />

      {adding && (
        <NewEnquiryDialog
          supplier={{
            id: data.supplier.id,
            name: data.supplier.name,
            country: data.supplier.country,
          }}
          inquiryId={data.id}
          onClose={() => setAdding(false)}
          onCreated={() => setAdding(false)}
        />
      )}

      {sending && (
        <SendEnquiryDialog
          enquiry={data}
          mode={sending}
          waitingItems={waiting}
          onClose={() => setSending(null)}
        />
      )}

      {quoting && (
        <QuotationDialog
          items={data.items}
          initialItemId={quoting === "pick" ? null : quoting.id}
          onClose={() => setQuoting(null)}
        />
      )}

      {conversation && (
        <ConversationDialog
          enquiry={data}
          onClose={() => setConversation(false)}
          onMatch={(messageId) => {
            setConversation(false);
            setReviewing({ messageId });
          }}
        />
      )}

      {reviewing && (
        <QuotationReviewDialog
          communicationId={reviewing.messageId}
          focusItemId={reviewing.itemId}
          onClose={() => setReviewing(null)}
          onRecordManually={() => {
            setReviewing(null);
            setQuoting("pick");
          }}
        />
      )}
    </div>
  );
}

// --- Formatting -----------------------------------------------------------------

/** "Sep 21, 2026" — the mockup's date form. */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "2 hours ago", "5 minutes ago", "yesterday", "3 days ago", then a date. */
function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

/** "John Zhang <sales@x.com>" → name + address; a bare address → its local
 *  part, title-cased, as the name. */
function parseSender(raw: string | null): { name: string; address: string | null } {
  if (!raw) return { name: "Supplier", address: null };
  const first = raw.split(",")[0].trim();
  const angled = first.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (angled) {
    const address = angled[2].trim();
    return { name: angled[1].trim() || localName(address), address };
  }
  if (first.includes("@")) return { name: localName(first), address: first };
  return { name: first, address: null };
}

function localName(address: string): string {
  return address
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CHIP = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
const TH = "px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

// --- Breadcrumb + header ---------------------------------------------------------

function Breadcrumb({ name }: { name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
      <Link
        href="/supplier-enquiries"
        className="inline-flex shrink-0 items-center gap-2 font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Supplier Enquiries
      </Link>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium text-foreground">{name}</span>
    </nav>
  );
}

function Header({
  enquiry,
  pendingCount,
  reading,
  onSend,
  onAddProduct,
  onReread,
}: {
  enquiry: EnquiryDetail;
  pendingCount: number;
  reading: boolean;
  onSend: () => void;
  onAddProduct: () => void;
  onReread: () => void;
}) {
  const state = ENQUIRY_STATE[enquiry.state];
  const router = useRouter();
  const sync = useSyncMailbox();
  const { data: mailbox } = useMailboxSettings();
  const canSend = mailbox?.can_send ?? false;
  const flag = flagFor(enquiry.supplier.country_code);
  const hasReplies = enquiry.messages.some((m) => m.direction === "inbound");

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-2">
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-2xl font-bold tracking-tight text-foreground sm:text-[28px] sm:leading-9">
          <Link href={`/companies/${enquiry.supplier.id}`} className="break-words hover:underline">
            {enquiry.supplier.name}
          </Link>
          <span className={cn(CHIP, "text-[13px]", state.className)}>{state.label}</span>
          {enquiry.reference && (
            <span className={cn(CHIP, "bg-secondary/60 text-[13px] text-foreground/80 ring-border")}>
              {enquiry.reference}
            </span>
          )}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted-foreground">
          {enquiry.supplier.country && (
            <>
              <span className="inline-flex items-center gap-2">
                {flag && (
                  <span aria-hidden className="text-base leading-none">
                    {flag}
                  </span>
                )}
                {enquiry.supplier.country}
              </span>
              <span aria-hidden className="text-border">|</span>
            </>
          )}
          <span>Created {fmtDate(enquiry.created_at)}</span>
          <span aria-hidden className="text-border">|</span>
          <span>Last activity: {timeAgo(enquiry.last_activity_at)}</span>
          {reading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Loader2 className="size-3.5 animate-spin" />
              Reading the supplier&rsquo;s reply…
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Button
          className="h-11 flex-1 px-4 lg:flex-none"
          onClick={onSend}
          disabled={!canSend}
          title={canSend ? undefined : "Connect a Gmail account in Settings to send"}
        >
          <Send />
          {pendingCount ? `Send Enquiry (${pendingCount})` : "Send Follow-up"}
        </Button>
        <Button variant="outline" className="h-11 flex-1 px-4 lg:flex-none" onClick={onAddProduct}>
          <Plus />
          Add Product
        </Button>
        <DropdownMenu
          trigger={(props) => (
            <button
              type="button"
              {...props}
              aria-label="More actions"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm hover:bg-accent"
            >
              <MoreHorizontal className="size-4" />
            </button>
          )}
        >
          {(close) => (
            <>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  sync.mutate(undefined, {
                    onSuccess: (result) =>
                      toast.success(
                        result.synced
                          ? `${result.synced} new message${result.synced === 1 ? "" : "s"}`
                          : "No new replies",
                      ),
                    onError: (err) =>
                      toast.error(err instanceof ApiError ? err.message : "Could not check for replies"),
                  });
                }}
              >
                <RefreshCw />
                Check for replies
              </DropdownMenuItem>
              {hasReplies && enquiry.reading_available && (
                <DropdownMenuItem
                  onClick={() => {
                    close();
                    onReread();
                  }}
                >
                  <Sparkles />
                  Re-read replies with AI
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  close();
                  navigator.clipboard.writeText(enquiry.reference ?? "");
                  toast.success("Reference copied");
                }}
              >
                <Copy />
                Copy reference
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  close();
                  router.push(`/companies/${enquiry.supplier.id}`);
                }}
              >
                <Building2 />
                Open supplier
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </div>
    </header>
  );
}

// --- Progress strip ----------------------------------------------------------------

type Step = { label: string; done: boolean; caption: string | null };

/** Five stages, each reached from facts already on the enquiry — nothing is
 *  stored for the strip itself. */
function stepsFor(enquiry: EnquiryDetail): Step[] {
  const inbound = enquiry.messages.filter((m) => m.direction === "inbound");
  const outbound = enquiry.messages.filter((m) => m.direction === "outbound");
  const sentAt =
    enquiry.sent_at ??
    outbound[0]?.occurred_at ??
    enquiry.items
      .map((item) => item.sent_at)
      .filter((v): v is string => Boolean(v))
      .sort()[0] ??
    null;
  const sent = sentAt !== null || enquiry.items.some((item) => item.state !== "pending");
  const firstReply = inbound[0]?.occurred_at ?? null;
  const quotes = [...enquiry.quotations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  // A quotation "arrives" when AI files a draft of it, and is "reviewed"
  // once nothing is left waiting for a person.
  const pendingDrafts = enquiry.drafts.filter((d) => d.status === "extracted");
  const firstQuote =
    [...pendingDrafts.map((d) => d.occurred_at), ...quotes.map((q) => q.created_at)].sort()[0] ?? null;
  const reviewed = quotes.length > 0 && pendingDrafts.length === 0;
  const lastReview = quotes
    .map((q) => q.verified_at)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  const completed = enquiry.state === "completed" || enquiry.state === "closed";

  return [
    { label: "Inquiry sent", done: sent, caption: sentAt ? fmtDate(sentAt) : null },
    { label: "Supplier replied", done: Boolean(firstReply), caption: firstReply ? timeAgo(firstReply) : null },
    { label: "Quotation received", done: firstQuote !== null, caption: firstQuote ? fmtDate(firstQuote) : null },
    { label: "Review", done: reviewed, caption: lastReview ? fmtDate(lastReview) : null },
    { label: "Completed", done: completed, caption: completed ? fmtDate(enquiry.last_activity_at) : null },
  ];
}

function ProgressStrip({ enquiry }: { enquiry: EnquiryDetail }) {
  const steps = stepsFor(enquiry);
  // The furthest stage reached is "current" — shown with its number, not a
  // tick — and everything before it counts as done.
  const current = steps.reduce((last, step, index) => (step.done ? index : last), -1);

  return (
    <section className="overflow-x-auto rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
      <ol className="flex min-w-[760px] items-center">
        {steps.map((step, index) => {
          const reached = index <= current;
          return (
            <li key={step.label} className={cn("flex items-center", index < steps.length - 1 && "flex-1")}>
              <div className="flex shrink-0 items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    reached ? "bg-success text-white" : "bg-secondary text-foreground/80",
                  )}
                >
                  {reached && index < current ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block whitespace-nowrap text-sm font-bold leading-5",
                      reached ? "text-success" : "text-foreground/80",
                    )}
                  >
                    {step.label}
                  </span>
                  {reached && step.caption && (
                    <span className="block whitespace-nowrap text-[11px] leading-4 text-muted-foreground">
                      {step.caption}
                    </span>
                  )}
                </span>
              </div>
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "mx-4 h-0.5 min-w-8 flex-1 rounded-full",
                    index < current ? "bg-success" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// --- Section shell -------------------------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {children}
    </section>
  );
}

function CardTitle({
  title,
  aside,
  action,
}: {
  title: string;
  aside?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {aside && <p className="text-[13px] text-muted-foreground">{aside}</p>}
      </div>
      {action}
    </div>
  );
}

function RowMenuButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent"
    >
      <MoreHorizontal className="size-4" />
    </button>
  );
}

// --- Items requested -------------------------------------------------------------------

const ITEM_MOVES: { to: SourcingStatus; label: string }[] = [
  { to: "sent", label: "Requested" },
  { to: "replied", label: "Replied" },
  { to: "quotation_received", label: "Quoted" },
  { to: "negotiating", label: "Negotiating" },
  { to: "selected", label: "Selected" },
  { to: "unavailable", label: "Unavailable" },
  { to: "rejected", label: "Rejected" },
  { to: "no_response", label: "No response" },
  { to: "cancelled", label: "Cancelled" },
];

/** The supplier's word on a product, for the status chip's tooltip and the
 *  row menu — the mockup keeps the table itself to the chip. */
function outcomeText(item: EnquiryItem): string | undefined {
  const outcome = item.reply_outcome;
  if (!outcome) return undefined;
  const label =
    outcome.outcome === "quoted" && item.state !== "quoted"
      ? "Answered without a price"
      : LINE_OUTCOME[outcome.outcome].label;
  return outcome.note ? `${label} — ${outcome.note}` : label;
}

/** `toReview`: AI has read a quotation for this product that nobody has
 *  approved yet — shown instead of "Replied" so the line is not mistaken for
 *  unanswered, and not as "Quoted" because nothing is official yet. */
function StatusChip({ item, toReview = false }: { item: EnquiryItem; toReview?: boolean }) {
  const state =
    toReview && (item.state === "replied" || item.state === "requested")
      ? { label: "Quote to review", className: "bg-tile-amber-bg text-tile-amber ring-tile-amber/30" }
      : ITEM_STATE[item.state];
  return (
    <span title={outcomeText(item)} className={cn(CHIP, "whitespace-nowrap text-[13px]", state.className)}>
      {state.label}
    </span>
  );
}

function ItemsSection({
  enquiry,
  reading,
  onAddProduct,
  onRecordQuote,
  onOpenReply,
}: {
  enquiry: EnquiryDetail;
  reading: boolean;
  onAddProduct: () => void;
  onRecordQuote: (item: EnquiryItem) => void;
  onOpenReply: (messageId: number) => void;
}) {
  // Old sourcing links land on `#item-<id>`. Each product renders twice (card
  // below lg, table row above) and the page arrives after the data does, so
  // the browser's own hash scroll can't be trusted: scroll to the visible one.
  const hasItems = enquiry.items.length > 0;
  useEffect(() => {
    const match = window.location.hash.match(/^#item-(\d+)$/);
    if (!match || !hasItems) return;
    const target = [`item-${match[1]}`, `item-card-${match[1]}`]
      .map((id) => document.getElementById(id))
      .find((el) => el && el.offsetParent !== null);
    target?.scrollIntoView({ block: "start" });
  }, [hasItems]);

  const count = enquiry.item_count;
  const toReview = new Set(
    enquiry.drafts
      .filter((d) => d.status === "extracted")
      .flatMap((d) => d.items.filter((i) => !i.is_excluded && i.sourcing_request_id).map((i) => i.sourcing_request_id!)),
  );
  return (
    <Card>
      <CardTitle
        title="Items requested"
        aside={`${count} product${count === 1 ? "" : "s"}${reading ? " · reading the reply…" : ""}`}
        action={
          <Button variant="outline" className="h-10 px-4" onClick={onAddProduct}>
            <Plus />
            Add Product
          </Button>
        }
      />

      {/* Below lg: one card per product, same fields as the table. */}
      <ul className="divide-y divide-border/70 border-t border-border lg:hidden">
        {enquiry.items.map((item) => (
          <li key={item.id} id={`item-card-${item.id}`} className="scroll-mt-24 px-4 py-3.5 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-medium leading-snug text-foreground">{item.product_name}</p>
                {item.cas_number && (
                  <p className="text-xs text-muted-foreground">CAS {item.cas_number}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusChip item={item} toReview={toReview.has(item.id)} />
                <ItemMenu item={item} onRecordQuote={onRecordQuote} onOpenReply={onOpenReply} />
              </div>
            </div>
            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <MiniFact label="Requested qty">{formatQuantity(item.required_quantity, item.quantity_unit)}</MiniFact>
              <MiniFact label="Quoted price">
                {item.latest_quotation ? formatPrice(item.latest_quotation) : "—"}
              </MiniFact>
              <MiniFact label="Source" className="col-span-2">
                <ItemSource item={item} />
              </MiniFact>
            </dl>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto border-t border-border lg:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className={cn(TH, "pl-5")}>Product</th>
              <th className={cn(TH, "w-[150px] whitespace-nowrap")}>CAS No.</th>
              <th className={cn(TH, "whitespace-nowrap")}>Requested qty</th>
              <th className={cn(TH, "w-[170px]")}>Source</th>
              <th className={cn(TH, "text-center")}>Quote status</th>
              <th className={TH}>Quoted price</th>
              <th className={cn(TH, "pr-5 text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {enquiry.items.map((item) => (
              <tr key={item.id} id={`item-${item.id}`} className="scroll-mt-24 hover:bg-accent/20">
                <td className="py-4 pl-5 pr-3 font-medium text-foreground">{item.product_name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-muted-foreground">
                  {item.cas_number ? `CAS ${item.cas_number}` : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 tabular-nums text-muted-foreground">
                  {formatQuantity(item.required_quantity, item.quantity_unit)}
                </td>
                <td className="w-[170px] max-w-[170px] break-words px-3 py-4 text-[13px] font-semibold leading-5 text-foreground/80">
                  <ItemSource item={item} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusChip item={item} toReview={toReview.has(item.id)} />
                </td>
                <td className="px-3 py-4 font-semibold tabular-nums text-foreground">
                  {item.latest_quotation ? (
                    formatPrice(item.latest_quotation)
                  ) : (
                    <span className="font-normal text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-4 pl-3 pr-5">
                  <div className="flex justify-end">
                    <ItemMenu item={item} onRecordQuote={onRecordQuote} onOpenReply={onOpenReply} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MiniFact({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium tabular-nums text-foreground/90">{children}</dd>
    </div>
  );
}

function ItemSource({ item }: { item: EnquiryItem }) {
  if (!item.tender) return <span>Direct sourcing</span>;
  return (
    <Link href={`/tenders/${item.tender.id}`} className="font-semibold text-primary hover:underline">
      {tenderLabel(item.tender)}
    </Link>
  );
}

/** Record quote, the supplier's reply about this product, and Mark as. */
function ItemMenu({
  item,
  onRecordQuote,
  onOpenReply,
}: {
  item: EnquiryItem;
  onRecordQuote: (item: EnquiryItem) => void;
  onOpenReply: (messageId: number) => void;
}) {
  const changeStatus = useChangeSourcingStatus();
  const router = useRouter();
  const busy = changeStatus.isPending && changeStatus.variables?.id === item.id;
  const outcome = outcomeText(item);

  return (
    <DropdownMenu
      trigger={(props) =>
        busy ? (
          <span className="flex size-9 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </span>
        ) : (
          <RowMenuButton {...props} label={`Actions for ${item.product_name}`} />
        )
      }
    >
      {(close) => (
        <>
          <DropdownMenuItem
            onClick={() => {
              close();
              onRecordQuote(item);
            }}
          >
            <Plus />
            Record quote
          </DropdownMenuItem>
          {item.reply_outcome && (
            <DropdownMenuItem
              onClick={() => {
                close();
                onOpenReply(item.reply_outcome!.message_id);
              }}
            >
              <MailSearch />
              <span className="min-w-0">
                <span className="block">View supplier&rsquo;s reply</span>
                {outcome && <span className="block max-w-56 truncate text-xs text-muted-foreground">{outcome}</span>}
              </span>
            </DropdownMenuItem>
          )}
          {item.tender && (
            <DropdownMenuItem
              onClick={() => {
                close();
                router.push(`/tenders/${item.tender!.id}`);
              }}
            >
              <FileText />
              Open tender
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Mark as</DropdownMenuLabel>
          {ITEM_MOVES.filter((move) => move.to !== item.status).map((move) => (
            <DropdownMenuItem
              key={move.to}
              onClick={() => {
                close();
                changeStatus.mutate(
                  { id: item.id, to_status: move.to },
                  {
                    onSuccess: () => toast.success(`${item.product_name}: ${move.label}`),
                    onError: (err) =>
                      toast.error(err instanceof ApiError ? err.message : "Could not change the status"),
                  },
                );
              }}
            >
              {move.label}
            </DropdownMenuItem>
          ))}
        </>
      )}
    </DropdownMenu>
  );
}

// --- Quotation review ----------------------------------------------------------------------

type EnquiryQuotation = EnquiryDetail["quotations"][number];

/** One row of the Quotation review table: an approved or hand-typed
 *  quotation, an AI-read item waiting for review, or a reply still being read
 *  (or that AI could not read). All open the same Review dialog. */
type ReviewRow = {
  key: string;
  product: string;
  subtitle?: string;
  price: Parameters<typeof formatPrice>[0] | null;
  moq: string | null;
  moqUnit: string | null;
  leadTime: number | null;
  incoterm: string | null;
  validUntil: string | null;
  received: string | null;
  status: keyof typeof REVIEW_STATUS | "manual" | "ai_extracted" | "additional";
  messageId: number | null;
  itemId?: number;
  quotation?: EnquiryQuotation;
};

const ROW_STATUS: Record<string, { label: string; className: string }> = {
  ...REVIEW_STATUS,
  approved: { label: "Approved", className: "bg-success/10 text-success ring-success/25" },
  manual: { label: "Manual", className: "bg-secondary text-muted-foreground ring-border" },
  ai_extracted: { label: "AI extracted", className: "bg-tile-blue-bg text-tile-blue ring-tile-blue/25" },
  additional: { label: "Additional product", className: "bg-tile-purple-bg text-tile-purple ring-tile-purple/25" },
};

function reviewRows(enquiry: EnquiryDetail): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const draft of enquiry.drafts) {
    if (draft.status !== "extracted") {
      rows.push({
        key: `draft-${draft.communication_id}`,
        product: `Supplier reply of ${fmtDate(draft.occurred_at)}`,
        subtitle:
          draft.status === "failed"
            ? (draft.extraction_error ?? "AI could not read this reply")
            : "Waiting for AI to read it",
        price: null,
        moq: null,
        moqUnit: null,
        leadTime: null,
        incoterm: null,
        validUntil: null,
        received: draft.occurred_at,
        status: draft.status,
        messageId: draft.communication_id,
      });
      continue;
    }
    for (const item of draft.items) {
      if (item.is_excluded && !item.is_additional) continue;
      rows.push({
        key: `item-${item.id}`,
        product: item.product_name,
        subtitle: item.raw_product_name !== item.product_name ? `Quoted as "${item.raw_product_name}"` : undefined,
        price: item,
        moq: item.moq,
        moqUnit: item.moq_unit,
        leadTime: item.lead_time_days,
        incoterm: item.incoterm,
        validUntil: item.valid_until,
        received: draft.occurred_at,
        status: item.is_additional ? "additional" : item.requires_review ? "extracted" : "ai_extracted",
        messageId: draft.communication_id,
        itemId: item.id,
      });
    }
  }
  for (const q of enquiry.quotations) {
    rows.push({
      key: `quotation-${q.id}`,
      product: q.product_name,
      price: q,
      moq: q.moq,
      moqUnit: q.moq_unit,
      leadTime: q.lead_time_days,
      incoterm: q.incoterm,
      validUntil: q.valid_until,
      received: q.quoted_on,
      status: q.source_communication_id ? "approved" : "manual",
      messageId: q.source_communication_id,
      quotation: q,
    });
  }
  return rows;
}

function QuotationsSection({
  enquiry,
  onRecord,
  onReview,
}: {
  enquiry: EnquiryDetail;
  onRecord: () => void;
  onReview: (messageId: number, itemId?: number) => void;
}) {
  const rows = reviewRows(enquiry);
  const quoted = new Set(enquiry.quotations.map((q) => q.sourcing_request_id)).size;
  const toReview = rows.filter((r) => r.status === "extracted" || r.status === "ai_extracted").length;

  return (
    <Card>
      <CardTitle
        title="Quotation review"
        aside={
          `${quoted} of ${enquiry.item_count} products quoted` +
          (toReview ? ` · ${toReview} to review` : "") +
          (enquiry.processing_replies ? " · AI reading a reply…" : "")
        }
        action={
          <Button variant="outline" className="h-10 px-4" onClick={onRecord}>
            <Plus />
            Record quotation
          </Button>
        }
      />
      {rows.length === 0 ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <EmptyBox
            icon={<FileText className="size-7" strokeWidth={1.5} />}
            title="No quotations yet"
            body="When the supplier replies with prices, AI reads them into a draft here for you to review."
          />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border/70 border-t border-border lg:hidden">
            {rows.map((row) => (
              <li key={row.key} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium leading-snug text-foreground">{row.product}</p>
                    {row.subtitle && <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>}
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {row.price ? formatPrice(row.price) : "—"}
                  </p>
                </div>
                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                  <MiniFact label="MOQ">{formatQuantity(row.moq, row.moqUnit)}</MiniFact>
                  <MiniFact label="Lead time">{row.leadTime != null ? `${row.leadTime} days` : "—"}</MiniFact>
                  <MiniFact label="Incoterm">{row.incoterm ?? "—"}</MiniFact>
                  <MiniFact label="Valid until">
                    <ValidUntil value={row.validUntil} />
                  </MiniFact>
                  <MiniFact label="Received">{fmtDate(row.received)}</MiniFact>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <RowStatus row={row} />
                  <RowActions row={row} onReview={onReview} />
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto border-t border-border lg:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className={cn(TH, "pl-5")}>Product</th>
                  <th className={TH}>Unit price</th>
                  <th className={TH}>MOQ</th>
                  <th className={TH}>Lead time</th>
                  <th className={TH}>Incoterm</th>
                  <th className={TH}>Valid until</th>
                  <th className={TH}>Received</th>
                  <th className={TH}>Status</th>
                  <th className={cn(TH, "pr-5 text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-accent/20">
                    <td className="max-w-[260px] py-4 pl-5 pr-3">
                      <p className="truncate font-medium text-foreground" title={row.product}>
                        {row.product}
                      </p>
                      {row.subtitle && (
                        <p className="truncate text-xs text-muted-foreground" title={row.subtitle}>
                          {row.subtitle}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 font-semibold tabular-nums text-foreground">
                      {row.price ? formatPrice(row.price) : <span className="font-normal text-muted-foreground">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums text-muted-foreground">
                      {formatQuantity(row.moq, row.moqUnit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums text-muted-foreground">
                      {row.leadTime != null ? `${row.leadTime} days` : "—"}
                    </td>
                    <td className="px-3 py-4 text-muted-foreground">{row.incoterm ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums text-muted-foreground">
                      <ValidUntil value={row.validUntil} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 tabular-nums text-muted-foreground">
                      {fmtDate(row.received)}
                    </td>
                    <td className="px-3 py-4">
                      <RowStatus row={row} />
                    </td>
                    <td className="py-4 pl-3 pr-5">
                      <RowActions row={row} onReview={onReview} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

function ValidUntil({ value }: { value: string | null }) {
  const expired = value ? new Date(value) < new Date() : false;
  return (
    <span className={cn(expired && "font-semibold text-destructive")}>
      {fmtDate(value)}
      {expired && " · expired"}
    </span>
  );
}

function RowStatus({ row }: { row: ReviewRow }) {
  const style = ROW_STATUS[row.status] ?? ROW_STATUS.detected;
  return (
    <span className={cn(CHIP, "whitespace-nowrap", style.className)}>
      {row.status === "processing" && <Loader2 className="mr-1 size-3 animate-spin" />}
      {style.label}
    </span>
  );
}

/** Review opens the supplier's email beside the draft or quotation. The row
 *  menu adds deleting an official quotation. */
function RowActions({
  row,
  onReview,
}: {
  row: ReviewRow;
  onReview: (messageId: number, itemId?: number) => void;
}) {
  const remove = useDeleteQuotation();
  const quotation = row.quotation;
  return (
    <div className="flex items-center justify-end gap-2">
      {row.messageId !== null && (
        <Button
          variant={row.status === "approved" ? "ghost" : "outline"}
          className="h-10 px-5"
          onClick={() => onReview(row.messageId!, row.itemId)}
        >
          Review
        </Button>
      )}
      {quotation && (
        <DropdownMenu
          trigger={(props) => <RowMenuButton {...props} label={`Actions for the ${quotation.product_name} quotation`} />}
        >
          {(close) => (
            <DropdownMenuItem
              onClick={() => {
                close();
                remove.mutate(quotation.id, {
                  onSuccess: () => toast.success(`Removed the quotation for ${quotation.product_name}`),
                  onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not remove it"),
                });
              }}
            >
              <Trash2 />
              Delete quotation
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      )}
    </div>
  );
}

// --- Email & communication -------------------------------------------------------------------

function CommunicationSection({
  enquiry,
  onOpenConversation,
  onMatch,
}: {
  enquiry: EnquiryDetail;
  onOpenConversation: () => void;
  onMatch: (messageId: number) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const newest = useMemo(
    () => [...enquiry.messages].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    [enquiry.messages],
  );
  const threads = new Set(enquiry.messages.map((m) => m.external_thread_id ?? `m-${m.id}`)).size;
  const count = enquiry.messages.length;
  const visible = showAll ? newest : newest.slice(0, 3);

  return (
    <Card>
      <CardTitle
        title="Email & communication"
        aside={
          count === 0
            ? "Nothing sent yet"
            : `${count} message${count === 1 ? "" : "s"} ${threads === 1 ? "in this thread" : `in ${threads} threads`}`
        }
        action={
          <Button variant="outline" className="h-10 px-4" onClick={onOpenConversation} disabled={count === 0}>
            <MessagesSquare />
            Open conversation
          </Button>
        }
      />
      {count === 0 ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <EmptyBox
            icon={<MessagesSquare className="size-7" strokeWidth={1.5} />}
            title="No emails yet"
            body="Emails to and from this supplier about these products will appear here."
          />
        </div>
      ) : (
        <div className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5">
          {visible.map((message) => (
            <MessageCard key={message.id} message={message} onMatch={onMatch} />
          ))}
          {newest.length > 3 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${newest.length} messages`}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/** Supplier replies and our own sent mail, told apart at a glance: a light
 *  blue card for what came in, a light green one for what we sent. */
const MAIL_TONE = {
  inbound: {
    card: "border-tile-blue/20 bg-tile-blue-bg/50 hover:bg-tile-blue-bg/80",
    strip: "border-tile-blue/15 bg-tile-blue-bg/40",
    avatar: "bg-tile-blue/15 text-tile-blue",
    chip: "bg-tile-blue/10 text-tile-blue ring-tile-blue/25",
    label: "Received",
  },
  outbound: {
    card: "border-tile-green/20 bg-tile-green-bg/50 hover:bg-tile-green-bg/80",
    strip: "border-tile-green/15 bg-tile-green-bg/40",
    avatar: "bg-tile-green/15 text-tile-green",
    chip: "bg-tile-green/10 text-tile-green ring-tile-green/25",
    label: "Sent",
  },
} as const;

function MessageCard({
  message,
  onMatch,
}: {
  message: EnquiryMessage;
  onMatch: (messageId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const inbound = message.direction === "inbound";
  const tone = MAIL_TONE[inbound ? "inbound" : "outbound"];
  const sender = inbound ? parseSender(message.counterparty) : { name: "You", address: null };
  const recipient = inbound ? null : parseSender(message.counterparty);
  const preview = message.body?.replace(/\s+/g, " ").trim() ?? "";
  const files = message.attachments.filter((a) => !a.is_inline);

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={`Open ${inbound ? "email from" : "email to"} ${inbound ? sender.name : (recipient?.address ?? "supplier")}`}
        className={cn(
          "cursor-pointer rounded-xl border px-3.5 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          tone.card,
        )}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
              tone.avatar,
            )}
          >
            {initials(sender.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-5 text-foreground">
              <span className="font-bold">{sender.name}</span>
              {sender.address && <span className="font-semibold text-foreground/80"> &lt;{sender.address}&gt;</span>}
              {recipient && (
                <span className="text-muted-foreground">
                  {" "}
                  → <span className="font-semibold text-foreground/80">{recipient.address ?? recipient.name}</span>
                </span>
              )}
            </p>
            <p className="truncate text-[13px] font-semibold leading-5 text-foreground">
              {message.subject ?? "(no subject)"}
            </p>
            {preview && <p className="truncate text-xs leading-5 text-muted-foreground">{preview}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2.5" onClick={(event) => event.stopPropagation()}>
            <div className="hidden flex-col items-end gap-1 sm:flex">
              <span className={cn(CHIP, "px-1.5 py-0 text-[10px]", tone.chip)}>{tone.label}</span>
              <span className="text-xs text-muted-foreground" title={formatDateTime(message.occurred_at)}>
                {timeAgo(message.occurred_at)}
              </span>
            </div>
            {files.length > 0 && <Paperclip aria-label={`${files.length} attachment(s)`} className="size-3.5 text-muted-foreground" />}
            <DropdownMenu trigger={(props) => <RowMenuButton {...props} label="Message actions" />}>
              {(close) => (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      close();
                      setOpen(true);
                    }}
                  >
                    <FileText />
                    Open email
                  </DropdownMenuItem>
                  {inbound && (
                    <DropdownMenuItem
                      onClick={() => {
                        close();
                        onMatch(message.id);
                      }}
                    >
                      <MailSearch />
                      Review quotation
                    </DropdownMenuItem>
                  )}
                  {files.length > 0 && <DropdownMenuSeparator />}
                  {files.map((file) => (
                    <DropdownMenuItem
                      key={file.id}
                      onClick={() => {
                        close();
                        downloadMailAttachment(file.id, file.filename);
                      }}
                    >
                      <Paperclip />
                      <span className="max-w-56 truncate">{file.filename}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenu>
          </div>
        </div>
      </article>
      {open && (
        <EmailDialog
          message={message}
          onClose={() => setOpen(false)}
          onReview={() => {
            setOpen(false);
            onMatch(message.id);
          }}
        />
      )}
    </>
  );
}

/** One email, on its own: who, when, the full text and its files. */
function EmailDialog({
  message,
  onClose,
  onReview,
}: {
  message: EnquiryMessage;
  onClose: () => void;
  onReview: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inbound = message.direction === "inbound";
  const tone = MAIL_TONE[inbound ? "inbound" : "outbound"];
  const other = parseSender(message.counterparty);
  const from = inbound ? other : { name: "You", address: null };
  const files = message.attachments.filter((a) => !a.is_inline);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-foreground/60 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-dialog-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <span className={cn(CHIP, "text-[11px]", tone.chip)}>{inbound ? "Received from supplier" : "Sent by you"}</span>
            <h2 id="email-dialog-title" className="break-words text-base font-semibold leading-snug text-foreground">
              {message.subject ?? "(no subject)"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className={cn("flex shrink-0 items-center gap-3 border-b px-5 py-3", tone.strip)}>
          <span
            aria-hidden
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              tone.avatar,
            )}
          >
            {initials(from.name)}
          </span>
          <dl className="min-w-0 flex-1 text-[13px] leading-5">
            <div className="flex gap-1.5">
              <dt className="w-10 shrink-0 text-muted-foreground">From</dt>
              <dd className="min-w-0 truncate">
                <span className="font-bold text-foreground">{from.name}</span>
                {from.address && <span className="font-semibold text-foreground/80"> &lt;{from.address}&gt;</span>}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="w-10 shrink-0 text-muted-foreground">To</dt>
              <dd className="min-w-0 truncate font-semibold text-foreground/80">
                {inbound ? "You" : (message.counterparty ?? "Supplier")}
              </dd>
            </div>
          </dl>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(message.occurred_at)}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
            {message.body?.trim() || "(This email has no text.)"}
          </p>
        </div>

        {(files.length > 0 || inbound) && (
          <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border px-5 py-3">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => downloadMailAttachment(file.id, file.filename)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/40"
              >
                <Paperclip className="size-3 shrink-0" />
                <span className="truncate">{file.filename}</span>
              </button>
            ))}
            {inbound && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={onReview}>
                <MailSearch className="size-3.5" />
                Review quotation
              </Button>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Every message on the enquiry, in full and oldest first, grouped by thread. */
function ConversationDialog({
  enquiry,
  onClose,
  onMatch,
}: {
  enquiry: EnquiryDetail;
  onClose: () => void;
  onMatch: (messageId: number) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const threads = useMemo(() => {
    const map = new Map<string, EnquiryMessage[]>();
    for (const message of enquiry.messages) {
      const key = message.external_thread_id ?? `m-${message.id}`;
      map.set(key, [...(map.get(key) ?? []), message]);
    }
    return [...map.values()].sort((a, b) =>
      b[b.length - 1].occurred_at.localeCompare(a[a.length - 1].occurred_at),
    );
  }, [enquiry.messages]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-foreground/60 p-2 backdrop-blur-md sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conversation-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3.5">
          <MessagesSquare className="size-5 text-primary" />
          <h2 id="conversation-title" className="flex-1 text-base font-bold text-foreground">
            Conversation with {enquiry.supplier.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent">
            <X className="size-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {threads.map((messages) => (
            <section key={messages[0].id} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{messages[0].subject ?? "(no subject)"}</h3>
              {messages.map((message) => {
                const inbound = message.direction === "inbound";
                const who = inbound ? parseSender(message.counterparty) : { name: "You", address: null };
                const files = message.attachments.filter((a) => !a.is_inline);
                return (
                  <article
                    key={message.id}
                    className={cn(
                      "rounded-xl border px-4 py-3",
                      inbound ? "border-border bg-card" : "border-border/60 bg-secondary/40",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-semibold text-foreground">{who.name}</span>
                      {who.address && <span className="text-muted-foreground">&lt;{who.address}&gt;</span>}
                      {!inbound && <span className="text-muted-foreground">to {message.counterparty ?? "supplier"}</span>}
                      <span className="ml-auto tabular-nums text-muted-foreground">{formatDateTime(message.occurred_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground/90">
                      {message.body?.trim() || "(no text)"}
                    </p>
                    {(files.length > 0 || (inbound && message.reading)) && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {files.map((file) => (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => downloadMailAttachment(file.id, file.filename)}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:border-primary/40"
                          >
                            <Paperclip className="size-3 shrink-0" />
                            <span className="truncate">{file.filename}</span>
                          </button>
                        ))}
                        {inbound && message.reading && (
                          <button
                            type="button"
                            onClick={() => onMatch(message.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <MailSearch className="size-3.5" />
                            Review quotation
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// --- Documents ---------------------------------------------------------------------------------

function EmptyBox({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-8 text-center">
      <span className="text-foreground/70">{icon}</span>
      <p className="mt-3 text-[15px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground sm:text-[15px]">{body}</p>
    </div>
  );
}

// The types a supplier sends back for an enquiry, first in the upload list.
const ENQUIRY_DOC_TYPES: DocType[] = ["quotation", "coa", "specification", "msds", "technical_data_sheet"];

function DocumentsSection({ enquiry }: { enquiry: EnquiryDetail }) {
  const { data, isPending } = useDocuments({ inquiry_id: enquiry.id, size: 50 });
  const documents = data?.items ?? [];
  const total = data?.total ?? 0;
  const [uploading, setUploading] = useState(false);

  return (
    <Card>
      <CardTitle
        title="Documents"
        aside={isPending ? "Loading…" : `${total} file${total === 1 ? "" : "s"}`}
        action={
          <Button variant="outline" className="h-10 px-4" onClick={() => setUploading((v) => !v)}>
            <Upload />
            Add document
          </Button>
        }
      />
      {uploading && <DocumentUploadForm enquiry={enquiry} onDone={() => setUploading(false)} />}
      {!isPending && documents.length === 0 ? (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <EmptyBox
            icon={<FileText className="size-8" strokeWidth={1.5} />}
            title="No documents yet"
            body="Upload quotations, COAs, specifications or other relevant files"
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/70 border-t border-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <FileText className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{doc.title}</span>
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                  <span className={cn("rounded px-1.5 py-px text-[10px] font-bold ring-1 ring-inset", typeChip(doc.doc_type))}>
                    {docTypeMeta(doc.doc_type).label}
                  </span>
                  {doc.mail_direction === "inbound"
                    ? "From supplier"
                    : doc.mail_direction === "outbound"
                      ? "Sent by us"
                      : "Uploaded"}
                  {" · "}
                  {fmtDate(doc.created_at)}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadDocument(doc.id, doc.title)}
                aria-label={`Download ${doc.title}`}
                className="shrink-0"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Add a document by hand. Filed against the chosen product line — or every
 *  line, for a file that covers the whole enquiry (one offer sheet for three
 *  products) — which is what makes it show up here and on each product. */
function DocumentUploadForm({ enquiry, onDone }: { enquiry: EnquiryDetail; onDone: () => void }) {
  const upload = useUploadDocument();
  const link = useLinkDocument();
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState<DocType>("quotation");
  const [lineId, setLineId] = useState<number | "all">(
    enquiry.items.length === 1 ? enquiry.items[0].id : "all",
  );
  const [busy, setBusy] = useState(false);
  const ordered = [
    ...ENQUIRY_DOC_TYPES.map((value) => docTypeMeta(value)),
    ...DOC_TYPES.filter((meta) => !ENQUIRY_DOC_TYPES.includes(meta.value)),
  ];

  async function save() {
    if (!files.length || !enquiry.items.length) return;
    setBusy(true);
    const targets = lineId === "all" ? enquiry.items.map((item) => item.id) : [lineId];
    let saved = 0;
    for (const file of files) {
      try {
        const result = await upload.mutateAsync({
          file,
          docType,
          target: "sourcing",
          targetId: targets[0],
        });
        for (const target of targets.slice(1)) {
          await link.mutateAsync({ id: result.document.id, target: "sourcing", targetId: target });
        }
        saved += 1;
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof ApiError ? err.message : "could not be uploaded"}`);
      }
    }
    setBusy(false);
    if (saved) {
      toast.success(`${saved} document${saved === 1 ? "" : "s"} added`);
      onDone();
    }
  }

  const selectClass =
    "h-9 w-full rounded-lg border-2 border-input bg-card px-2 text-sm font-medium text-foreground";

  return (
    <div className="mx-4 mb-4 space-y-3 rounded-xl border border-border bg-secondary/20 px-4 py-4 sm:mx-5 sm:mb-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 sm:col-span-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Files</span>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.docx,.xlsx"
            onChange={(event) => setFiles([...(event.target.files ?? [])])}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</span>
          <select value={docType} onChange={(event) => setDocType(event.target.value as DocType)} className={selectClass}>
            {ordered.map((meta) => (
              <option key={meta.value} value={meta.value}>
                {meta.label === meta.fullName ? meta.label : `${meta.label} — ${meta.fullName}`}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">For</span>
          <select
            value={lineId}
            onChange={(event) => setLineId(event.target.value === "all" ? "all" : Number(event.target.value))}
            className={selectClass}
          >
            {enquiry.items.length > 1 && <option value="all">All products in this enquiry</option>}
            {enquiry.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product_name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy || files.length === 0}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          Upload{files.length > 1 ? ` ${files.length} files` : ""}
        </Button>
      </div>
    </div>
  );
}
