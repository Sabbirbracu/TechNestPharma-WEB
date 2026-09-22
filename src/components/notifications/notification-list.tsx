"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BadgeDollarSign,
  BellOff,
  ChevronDown,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  ScanLine,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getSoundServerSnapshot,
  isSoundEnabled,
  playNotificationSound,
  setSoundEnabled,
  subscribeToSound,
} from "@/lib/notification-sound";
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useInfiniteNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/lib/queries";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/components/sourcing/sourcing-taxonomy";
import type { AppNotification, NotificationKind } from "@/types/api";

/** Icon and accent per kind. Colour is never the only signal — every row also
 *  carries its own words — but it makes a long tray scannable. */
const KIND_STYLE: Record<
  NotificationKind,
  { icon: typeof Mail; tint: string }
> = {
  supplier_replied: { icon: Mail, tint: "bg-tile-green-bg text-tile-green" },
  inbox_mail: { icon: Inbox, tint: "bg-tile-teal-bg text-tile-teal" },
  follow_up_due: { icon: Clock, tint: "bg-tile-amber-bg text-tile-amber" },
  status_changed: { icon: RefreshCw, tint: "bg-tile-blue-bg text-tile-blue" },
  // "Supplier quoted 2 of 3 products" — opens the enquiry, where the
  // unchecked figures sit beside a Match-with-email check.
  quotation_detected: {
    icon: BadgeDollarSign,
    tint: "bg-tile-amber-bg text-tile-amber",
  },
  notice_fetched: { icon: ScanLine, tint: "bg-tile-purple-bg text-tile-purple" },
  // The one row in this tray that reports the system failing rather than the
  // world changing, so it is the one that gets the destructive tint.
  fetch_failed: {
    icon: AlertTriangle,
    tint: "bg-destructive/10 text-destructive",
  },
};

/**
 * The notification tray's contents.
 *
 * Starts with the newest page and can progressively reveal the full history.
 */
export function NotificationList({
  onNavigate,
  unreadCount,
}: {
  onNavigate: () => void;
  unreadCount: number;
}) {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Through the store rather than `useState`: localStorage cannot be read
  // while the server renders, so the preference has to arrive after hydration
  // without the first render mismatching.
  const soundOn = useSyncExternalStore(
    subscribeToSound,
    isSoundEnabled,
    getSoundServerSnapshot,
  );

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    // Play it on the way on, so the toggle demonstrates what it just enabled —
    // and this click is itself the gesture that unlocks audio.
    if (next) playNotificationSound();
  };
  const {
    data,
    isPending,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteNotifications(unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const hasUnread = unreadCount > 0;

  const open = (notification: AppNotification) => {
    if (notification.read_at === null) markRead.mutate(notification.id);
    // The (type, id) pair is loose on purpose, so an unknown type simply does
    // not navigate rather than 404s.
    if (notification.entity_type === "sourcing_request" && notification.entity_id) {
      router.push(`/sourcing?open=${notification.entity_id}`);
      onNavigate();
      return;
    }
    // Inbox mail carries no id: a Gmail message id is a hex string and
    // `entity_id` is a bigint, so the tray opens the inbox itself rather than
    // one message. The mail is at the top of whichever tab it was sorted into.
    if (notification.entity_type === "inbox") {
      router.push("/email/inbox");
      onNavigate();
      return;
    }
    // A reply was read into the enquiry: open it, where the new quotations
    // are shown Unchecked beside their Match-with-email check.
    if (notification.entity_type === "inquiry" && notification.entity_id) {
      router.push(`/supplier-enquiries/${notification.entity_id}`);
      onNavigate();
      return;
    }
    // Bells from the retired review queue (2026-09-20) carry a draft id, which
    // has no page any more; the enquiry list is the nearest place to land.
    if (notification.entity_type === "quotation_draft") {
      router.push("/supplier-enquiries");
      onNavigate();
      return;
    }
    if (notification.entity_type === "tender_notice" && notification.entity_id) {
      router.push(`/tender-notices/${notification.entity_id}`);
      onNavigate();
      return;
    }
    // A failed fetch carries the source, not a notice — there is nothing to
    // open — so it lands on the inbox, where the status band says what broke
    // and offers the retry.
    if (notification.entity_type === "notice_source") {
      router.push("/tender-notices");
      onNavigate();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border/60 bg-background/40 px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setUnreadOnly((value) => !value)}
            aria-pressed={unreadOnly}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-all",
              unreadOnly
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {unreadOnly ? "Unread only" : "All activity"}
          </button>
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            title={soundOn ? "Sound on — click to mute" : "Sound muted"}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {soundOn ? (
              <Volume2 className="size-3.5" strokeWidth={2.25} />
            ) : (
              <VolumeX className="size-3.5" strokeWidth={2.25} />
            )}
            <span>{soundOn ? "Sound on" : "Muted"}</span>
          </button>
        </div>

        {(hasUnread || total > 0) && (
          <div className="mt-3 flex items-center gap-2">
            {hasUnread && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:brightness-95 disabled:opacity-60"
              >
                {markAllRead.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5" strokeWidth={2.5} />
                )}
                Mark all as read
              </button>
            )}
            {total > 0 && (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary ring-1 ring-inset ring-primary/10">
            <BellOff className="size-5" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">
              {unreadOnly ? "Nothing unread" : "You’re all caught up"}
            </p>
            <p className="max-w-60 text-xs font-medium leading-relaxed text-muted-foreground">
              Supplier replies, follow-ups coming due and enquiry status changes
              land here as they happen.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/[0.18] px-3 py-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              {unreadOnly ? "Unread" : "Activity"}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground">
              {total} total
            </p>
          </div>
        <ul className="space-y-2">
          {items.map((notification) => {
            const style = KIND_STYLE[notification.kind];
            const Icon = style?.icon ?? Mail;
            const unread = notification.read_at === null;

            return (
              <li key={notification.id} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
                <button
                  type="button"
                  onClick={() => open(notification)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3.5 pr-12 text-left transition-colors hover:bg-accent/50",
                    unread && "bg-primary/[0.045]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.03]",
                      style?.tint ?? "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={2.25} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold leading-snug text-foreground">
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="mt-1 block truncate text-xs font-medium text-muted-foreground">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-1.5 block text-[11px] font-semibold text-muted-foreground">
                      {relativeTime(notification.created_at)}
                    </span>
                  </span>

                  {unread && (
                    <span
                      aria-label="Unread"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px] shadow-primary/15"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => deleteNotification.mutate(notification.id)}
                  disabled={deleteNotification.isPending}
                  aria-label={`Delete notification: ${notification.title}`}
                  title="Delete notification"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                >
                  {deleteNotification.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" strokeWidth={2.25} />
                  )}
                </button>
              </li>
            );
          })}
          {hasNextPage && (
            <li className="p-2 text-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-2.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="size-3.5" strokeWidth={2.5} />
                )}
                Load older notifications
              </button>
            </li>
          )}
          {total > 0 && (
            <li className="px-5 py-2 text-center text-[11px] font-semibold text-muted-foreground">
              Showing {items.length} of {total} notification{total === 1 ? "" : "s"}
            </li>
          )}
        </ul>
        </div>
      )}
      {confirmingClear && (
        <ConfirmDialog
          title="Clear all notifications?"
          description="This permanently removes your entire notification history. This cannot be undone."
          confirmLabel="Clear all"
          busy={deleteAll.isPending}
          onConfirm={() =>
            deleteAll.mutate(undefined, {
              onSettled: () => setConfirmingClear(false),
            })
          }
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </div>
  );
}
