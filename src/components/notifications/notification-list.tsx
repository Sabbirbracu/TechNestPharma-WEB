"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BellOff,
  CheckCheck,
  Clock,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  ScanLine,
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
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/queries";
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
 * Reads the first page only. A bell is a "what happened since I last looked"
 * surface, not an archive — twenty entries is already more than anyone scrolls,
 * and the enquiry itself is the real record.
 */
export function NotificationList({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
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
  const { data, isPending } = useNotifications(1, unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];
  const hasUnread = items.some((item) => item.read_at === null);

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
      router.push("/inbox");
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
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-5 py-2.5">
        <button
          type="button"
          onClick={() => setUnreadOnly((value) => !value)}
          className={cn(
            "rounded-lg px-2 py-1 text-[11px] font-bold transition-colors",
            unreadOnly
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {unreadOnly ? "Showing unread" : "Show unread only"}
        </button>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          title={soundOn ? "Sound on — click to mute" : "Sound muted"}
          className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {soundOn ? (
            <Volume2 className="size-3.5" strokeWidth={2.25} />
          ) : (
            <VolumeX className="size-3.5" strokeWidth={2.25} />
          )}
          <span className="sr-only">
            {soundOn ? "Mute notification sound" : "Unmute notification sound"}
          </span>
        </button>

        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
          >
            {markAllRead.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCheck className="size-3" strokeWidth={2.5} />
            )}
            Mark all read
          </button>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground ring-1 ring-inset ring-border/60">
            <BellOff className="size-5" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">
              {unreadOnly ? "Nothing unread" : "You’re all caught up"}
            </p>
            <p className="max-w-60 text-xs font-medium text-muted-foreground">
              Supplier replies, follow-ups coming due and enquiry status changes
              land here as they happen.
            </p>
          </div>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {items.map((notification) => {
            const style = KIND_STYLE[notification.kind];
            const Icon = style?.icon ?? Mail;
            const unread = notification.read_at === null;

            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => open(notification)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/40 px-5 py-3.5 text-left transition-colors hover:bg-accent/50",
                    unread && "bg-primary/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl",
                      style?.tint ?? "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={2.25} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-snug text-foreground">
                      {notification.title}
                    </span>
                    {notification.body && (
                      <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">
                        {notification.body}
                      </span>
                    )}
                    <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                      {relativeTime(notification.created_at)}
                    </span>
                  </span>

                  {unread && (
                    <span
                      aria-label="Unread"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
