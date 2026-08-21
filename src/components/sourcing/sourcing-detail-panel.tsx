"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Bookmark,
  ChevronDown,
  FileText,
  Loader2,
  MessageSquare,
  MoreVertical,
  NotebookPen,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useChangeSourcingStatus, useSourcingRequest } from "@/lib/queries";
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABELS,
  STATUS_OPTIONS,
  STATUS_STYLES,
  dueIn,
  formatDate,
  formatDateTime,
  priceBand,
  referenceOf,
} from "./sourcing-taxonomy";
import type {
  Communication,
  Quotation,
  SourcingRequestDetail,
  SourcingRequestListItem,
  StatusHistoryEntry,
} from "@/types/api";

type Tab = "timeline" | "communications" | "quotations" | "documents";

/**
 * Everything about one request, over the list rather than beside it.
 *
 * A modal, so the table keeps the full viewport width instead of permanently
 * giving up a column to a panel that is empty most of the time.
 */
export function SourcingDetailPanel({
  request,
  onClose,
}: {
  request: SourcingRequestListItem;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("timeline");
  const { data, isPending } = useSourcingRequest(request.id);

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

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Sourcing request for ${request.product.name_en}`}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border/60 bg-card shadow-xl sm:max-w-2xl sm:rounded-2xl">
      <header className="shrink-0 space-y-3 border-b border-border/60 p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold leading-tight tracking-tight text-foreground">
                {request.product.name_en}
              </h2>
              <StatusMenu request={request} />
            </div>
            <p className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">
              Sourcing Request #{referenceOf(request)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {/* Watchlisting a request is not built; shown disabled so the
                header matches the design without pretending to work. */}
            <IconButton
              label="Watchlist this request"
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
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Fact label="Supplier">
            <Link
              href={`/companies/${request.company.id}`}
              className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
              title={request.company.name_en}
            >
              {request.company.name_en}
            </Link>
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
                Speculative Inquiry
              </span>
            )}
          </Fact>

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
                {trimNumber(request.required_quantity)}{" "}
                {request.quantity_unit ?? ""}
              </span>
            ) : (
              <NotAvailable />
            )}
          </Fact>

          <Fact label="Target Price">
            {priceBand(
              request.target_price_min,
              request.target_price_max,
              request.target_currency,
              request.target_price_unit,
            ) ? (
              <span className="text-sm font-semibold text-foreground">
                {priceBand(
                  request.target_price_min,
                  request.target_price_max,
                  request.target_currency,
                  request.target_price_unit,
                )}
              </span>
            ) : (
              <NotAvailable />
            )}
          </Fact>
        </dl>
      </header>

      <nav
        aria-label="Request detail"
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border/60 px-3"
      >
        <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>
          Timeline
        </TabButton>
        <TabButton
          active={tab === "communications"}
          onClick={() => setTab("communications")}
        >
          Communications ({detail?.communications.length ?? request.communication_count})
        </TabButton>
        <TabButton
          active={tab === "quotations"}
          onClick={() => setTab("quotations")}
        >
          Quotations ({detail?.quotations.length ?? request.quotation_count})
        </TabButton>
        <TabButton active={tab === "documents"} onClick={() => setTab("documents")}>
          Documents
        </TabButton>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {isPending ? (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" />
            Loading the full record…
          </div>
        ) : !detail ? (
          <p className="text-sm font-medium text-muted-foreground">
            Could not load this request.
          </p>
        ) : tab === "timeline" ? (
          <Timeline detail={detail} onOpenTab={setTab} />
        ) : tab === "communications" ? (
          <Communications items={detail.communications} />
        ) : tab === "quotations" ? (
          <Quotations items={detail.quotations} />
        ) : (
          <Documents />
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-2.5 border-t border-border/60 bg-secondary/30 p-4">
        {/* Sending is the Gmail slice, which needs OAuth credentials that do
            not exist yet. Disabled rather than hidden — the action belongs
            here, and its absence would misrepresent the workflow. */}
        <Button
          type="button"
          disabled
          title="Email sending is not connected yet"
          className="flex-1"
        >
          <Send strokeWidth={2.25} />
          Send Follow-up
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled
          title="Notes are not editable from the panel yet"
          className="flex-1"
        >
          <NotebookPen strokeWidth={2.25} />
          Add Note
        </Button>
      </footer>
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Tabs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The status history and the exchanges, interleaved into one story.
 *
 * They are separate tables — a status change is not a message — but a reader
 * asking "what happened here" wants them in one column, in order.
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
      tab: "communications" as Tab,
      actionLabel:
        entry.channel === "email" ? "View Email" : "View Message",
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const due = dueIn(detail.follow_up_on);

  return (
    <ol className="relative space-y-5">
      {entries.map((entry) => (
        <li key={entry.key} className="relative flex gap-3 pl-1">
          <span
            aria-hidden
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", entry.dot)}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{entry.title}</p>
            {entry.meta && (
              <p className="truncate text-xs font-medium text-muted-foreground">
                {entry.meta}
              </p>
            )}
            <p className="text-xs font-medium text-muted-foreground">
              {formatDateTime(entry.at)}
            </p>
          </div>
          {entry.tab && (
            <button
              type="button"
              onClick={() => onOpenTab(entry.tab as Tab)}
              className="shrink-0 self-start rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {entry.actionLabel}
            </button>
          )}
        </li>
      ))}

      {/* The one forward-looking row: what is owed next, not what happened. */}
      {due && (
        <li className="relative flex gap-3 pl-1">
          <span
            aria-hidden
            className="mt-1.5 size-2 shrink-0 rounded-full border-2 border-tile-amber bg-transparent"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Follow-up due</p>
            <p className="text-xs font-medium text-muted-foreground">
              Send a follow-up to the supplier
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1 text-right text-[11px] font-semibold",
              due.overdue
                ? "bg-destructive/10 text-destructive"
                : "bg-tile-amber-bg text-tile-amber",
            )}
          >
            {formatDate(detail.follow_up_on)}
            <span className="block font-medium">{due.text}</span>
          </span>
        </li>
      )}
    </ol>
  );
}

function Communications({ items }: { items: Communication[] }) {
  if (items.length === 0) {
    return (
      <EmptyTab
        icon={MessageSquare}
        title="No exchanges logged"
        body="Log a call, a meeting, or a message and it will appear here and on the timeline."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="space-y-1.5 rounded-xl border border-border/60 p-3.5"
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
            {item.has_attachments && (
              <Paperclip
                className="size-3.5 text-muted-foreground"
                aria-label="Has attachments"
              />
            )}
            <span className="ml-auto text-xs font-medium text-muted-foreground">
              {formatDateTime(item.occurred_at)}
            </span>
          </div>
          {item.subject && (
            <p className="text-sm font-semibold text-foreground">{item.subject}</p>
          )}
          {item.counterparty && (
            <p className="truncate text-xs font-medium text-muted-foreground">
              {item.counterparty}
            </p>
          )}
          {item.body && (
            <p className="line-clamp-3 text-xs font-medium leading-relaxed text-muted-foreground">
              {item.body}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function Quotations({ items }: { items: Quotation[] }) {
  if (items.length === 0) {
    return (
      <EmptyTab
        icon={FileText}
        title="No quotations recorded"
        body="Record what the supplier quoted and the request moves to Quotation Received."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((quotation) => (
        <li
          key={quotation.id}
          className="space-y-2.5 rounded-xl border border-border/60 p-3.5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-bold tracking-tight text-foreground">
              {priceBand(
                quotation.price_min,
                quotation.price_max,
                quotation.currency,
                quotation.price_unit,
              ) ?? "No price quoted"}
            </p>
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {formatDate(quotation.quoted_on)}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <Line
              label="MOQ"
              value={
                quotation.moq
                  ? `${trimNumber(quotation.moq)} ${quotation.moq_unit ?? ""}`.trim()
                  : null
              }
            />
            <Line label="Packing" value={quotation.packing} />
            <Line
              label="Lead time"
              value={
                quotation.lead_time_days !== null
                  ? `${quotation.lead_time_days} days`
                  : null
              }
            />
            <Line label="Incoterm" value={quotation.incoterm} />
            <Line label="Specification" value={quotation.specification} />
            {/* An expired quote is not a comparable one, so validity is shown
                even when the rest is sparse. */}
            <Line
              label="Valid until"
              value={quotation.valid_until ? formatDate(quotation.valid_until) : null}
            />
          </dl>
        </li>
      ))}
    </ul>
  );
}

/** The document library has no API for sourcing requests yet — the schema link
 *  exists (`document_link.sourcing_request_id`) but nothing serves it. Saying
 *  so beats a tab that silently shows nothing. */
function Documents() {
  return (
    <EmptyTab
      icon={Paperclip}
      title="Documents are not connected yet"
      body="The link between a request and its attachments exists in the database; the document API for it has not been built."
    />
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
          <DropdownMenuItem disabled title="Editing a request is not built yet">
            Edit request
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

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right font-medium",
          value ? "text-foreground" : "text-muted-foreground/60",
        )}
        title={value ?? undefined}
      >
        {value ?? "—"}
      </dd>
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
  if (entry.from_status === null) return "Request created";
  return `Moved to ${STATUS_STYLES[entry.to_status].label}`;
}

/** Numerics arrive as "500.000"; the trailing zeros are storage precision. */
function trimNumber(value: string): string {
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
