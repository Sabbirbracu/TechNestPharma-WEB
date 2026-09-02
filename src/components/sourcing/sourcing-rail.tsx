"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  FileDown,
  FileText,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Settings2,
  Sparkles,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dueIn, isClosed, relativeTime } from "./sourcing-taxonomy";
import type { MailboxStatus, SourcingRequestListItem } from "@/types/api";

/**
 * The column beside the list: what arrived, and what is due.
 *
 * Both cards deliberately ignore the page's filters. They answer "is anything
 * waiting on me" — a question whose answer must not change because the reader
 * happened to narrow the table to one supplier.
 */

/* --- Quick actions -------------------------------------------------------- */

export function QuickActionsCard({
  onSync,
  syncing,
  status,
}: {
  onSync: () => void;
  syncing: boolean;
  /** Undefined while the mailbox settings are still loading. */
  status: MailboxStatus | undefined;
}) {
  const canSync = status === "connected";

  // `needs_reauth` is an expected weekly state on this deployment, not a
  // fault: the grant is a consumer @gmail.com on a Testing-mode OAuth app, so
  // it lapses every 7 days. It has to stay visible somewhere or a Monday
  // morning send fails with no explanation — so when it lapses this row stops
  // being a sync button and becomes the way to fix it.
  const mail =
    status === "needs_reauth"
      ? {
          title: "Reconnect the mailbox",
          subtitle: "The Google grant has expired",
          tile: "bg-warning/15 text-warning-foreground ring-warning/25",
          icon: AlertTriangle,
          href: "/settings/mailbox",
        }
      : status === "disconnected"
        ? {
            title: "Connect a mailbox",
            subtitle: "No Gmail account is linked yet",
            tile: "bg-secondary text-muted-foreground ring-border/60",
            icon: Unplug,
            href: "/settings/mailbox",
          }
        : {
            title: "Check for replies",
            subtitle: "Pull new supplier mail now",
            tile: "bg-tile-purple-bg text-tile-purple ring-tile-purple/15",
            icon: RefreshCw,
            href: undefined,
          };

  return (
    <RailCard title="Quick Actions" icon={Sparkles}>
      <div className="space-y-1">
        {/* Composing from a blank page is not built — the flow that feeds this
            is "Start Enquiry" from a tender shortlist or a product's supplier
            list. Disabled rather than hidden, so the card shows the shape the
            screen is heading towards. */}
        <QuickAction
          icon={Mail}
          tile="bg-tile-green-bg text-tile-green ring-tile-green/15"
          title="New Enquiry"
          subtitle="Not available yet — start from a tender"
          disabled
        />
        <QuickAction
          icon={FileDown}
          tile="bg-tile-blue-bg text-tile-blue ring-tile-blue/15"
          title="Start from a Tender"
          subtitle="Shortlist suppliers, then enquire"
          href="/tenders"
        />
        <QuickAction
          icon={mail.icon}
          tile={mail.tile}
          title={mail.title}
          subtitle={mail.subtitle}
          href={mail.href}
          onClick={mail.href ? undefined : onSync}
          disabled={!canSync || syncing}
          busy={syncing}
        />
        <QuickAction
          icon={Settings2}
          tile="bg-tile-amber-bg text-tile-amber ring-tile-amber/15"
          title="Mailbox Settings"
          subtitle="Connection, sender name, re-auth"
          href="/settings/mailbox"
        />
      </div>
    </RailCard>
  );
}

function QuickAction({
  icon: Icon,
  tile,
  title,
  subtitle,
  href,
  onClick,
  disabled,
  busy,
}: {
  icon: LucideIcon;
  tile: string;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const body = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
          tile,
        )}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
        ) : (
          <Icon className="size-4" strokeWidth={2.25} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="block truncate text-xs font-medium text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </>
  );

  const shell =
    "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? subtitle : undefined}
      className={cn(shell, "disabled:cursor-not-allowed disabled:opacity-55")}
    >
      {body}
    </button>
  );
}

/* --- Recent inbox activity ------------------------------------------------ */

/**
 * The enquiries a supplier wrote on most recently.
 *
 * It lists enquiries rather than messages because the enquiry is the thing to
 * act on — the plan's own point that Sourcing is the business object and email
 * is only the channel underneath it. Clicking one opens its conversation.
 *
 * "New" here means `awaiting_us`: the supplier had the last word. That is
 * derived from the thread rather than from a per-user read flag, so it is
 * honest without a read-state model — the marker clears when someone answers,
 * not when someone glances.
 */
export function RecentInboxCard({
  requests,
  isPending,
  onSelect,
  onViewAll,
}: {
  requests: SourcingRequestListItem[];
  isPending: boolean;
  onSelect: (request: SourcingRequestListItem) => void;
  onViewAll: () => void;
}) {
  const replied = requests
    .filter((request) => request.last_inbound_at && !isClosed(request.status))
    .sort(
      (a, b) =>
        new Date(b.last_inbound_at!).getTime() -
        new Date(a.last_inbound_at!).getTime(),
    )
    .slice(0, 4);

  const unanswered = replied.filter((request) => request.awaiting_us).length;

  return (
    <RailCard
      title="Recent Inbox Activity"
      icon={Inbox}
      badge={unanswered > 0 ? unanswered : undefined}
      badgeTone="bg-success text-success-foreground"
    >
      {isPending ? (
        <RailLoading />
      ) : replied.length === 0 ? (
        <RailEmpty
          text="No supplier replies yet. Anything that arrives will show up here."
        />
      ) : (
        <>
          <div className="space-y-1">
            {replied.map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => onSelect(request)}
                className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tile-blue-bg text-tile-blue ring-1 ring-inset ring-tile-blue/15">
                  <Building2 className="size-4" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                      {request.company.name_en}
                    </span>
                    {request.awaiting_us && (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-success">
                        <span className="size-1.5 rounded-full bg-success" />
                        New
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs font-medium text-muted-foreground">
                    {request.product.name_en}
                  </span>
                  <span className="block text-[11px] font-medium text-muted-foreground/80">
                    Replied {relativeTime(request.last_inbound_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <RailFooter label="View all replies" onClick={onViewAll} />
        </>
      )}
    </RailCard>
  );
}

/* --- Follow-ups due ------------------------------------------------------- */

export function FollowUpsCard({
  requests,
  isPending,
  onSelect,
  onViewAll,
}: {
  requests: SourcingRequestListItem[];
  isPending: boolean;
  onSelect: (request: SourcingRequestListItem) => void;
  onViewAll: () => void;
}) {
  const due = requests
    .filter((request) => request.follow_up_on && !isClosed(request.status))
    .slice(0, 4);

  const overdue = due.filter(
    (request) => dueIn(request.follow_up_on)?.overdue,
  ).length;

  return (
    <RailCard
      title="Follow-ups Due"
      icon={CalendarClock}
      badge={due.length > 0 ? due.length : undefined}
      badgeTone={
        overdue > 0
          ? "bg-destructive text-destructive-foreground"
          : "bg-secondary text-secondary-foreground"
      }
    >
      {isPending ? (
        <RailLoading />
      ) : due.length === 0 ? (
        <RailEmpty text="Nothing to chase. Set a follow-up date on an enquiry to see it here." />
      ) : (
        <>
          <div className="space-y-1">
            {due.map((request) => {
              const when = dueIn(request.follow_up_on);
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => onSelect(request)}
                  className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tile-amber-bg text-tile-amber ring-1 ring-inset ring-tile-amber/15">
                    <FileText className="size-4" strokeWidth={2.25} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                        {request.company.name_en}
                      </span>
                      {when && (
                        <span
                          className={cn(
                            "shrink-0 text-[11px] font-bold",
                            when.overdue ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {when.text}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs font-medium text-muted-foreground">
                      {request.product.name_en}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <RailFooter label="View all follow-ups" onClick={onViewAll} />
        </>
      )}
    </RailCard>
  );
}

/* --- Shell ---------------------------------------------------------------- */

function RailCard({
  title,
  icon: Icon,
  badge,
  badgeTone,
  children,
}: {
  title: string;
  icon: LucideIcon;
  badge?: number;
  badgeTone?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
        <h2 className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
          {title}
        </h2>
        {badge !== undefined && (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
              badgeTone,
            )}
          >
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function RailFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group mt-3 flex w-full items-center justify-center gap-1.5 border-t border-border/50 pt-3 text-xs font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {label}
      <ArrowRight
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
        strokeWidth={2.5}
      />
    </button>
  );
}

function RailLoading() {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-secondary/70" />
      ))}
    </div>
  );
}

function RailEmpty({ text }: { text: string }) {
  return (
    <p className="py-4 text-center text-xs font-medium text-muted-foreground">
      {text}
    </p>
  );
}
