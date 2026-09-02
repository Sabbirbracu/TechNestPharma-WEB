"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { API_BASE_URL, getAccessToken, refreshSession } from "@/lib/api";
import { playNotificationSound } from "@/lib/notification-sound";
import { keys } from "@/lib/queries";
import type { AppNotification } from "@/types/api";

/**
 * Subscribe to the server's notification stream for as long as the app is open.
 *
 * **Why `fetch` and not `EventSource`.** EventSource cannot set request
 * headers, and this app's access token lives in memory and travels as
 * `Authorization: Bearer` (the refresh token is the httpOnly cookie, and it is
 * not what authorises API calls). The alternative — putting the token in the
 * query string — would write a credential into nginx's access log and into
 * browser history. Reading the response body as a stream costs a hand-written
 * parser and buys back the header.
 *
 * **Reconnection is ours to write**, for the same reason: EventSource retries
 * on its own, `fetch` does not. The loop below backs off to 30s so a backend
 * restart does not turn every open tab into a retry storm, and treats a 401 as
 * "renew the token and try again" rather than as a fatal error — a stream held
 * open for hours will always outlive a 15-minute access token.
 */
export function useNotificationStream(enabled: boolean) {
  const queryClient = useQueryClient();
  // Held in a ref so the effect below depends only on `enabled`; a new
  // QueryClient identity would otherwise tear down a healthy connection.
  const clientRef = useRef(queryClient);
  clientRef.current = queryClient;

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let stopped = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const onNotification = (notification: AppNotification) => {
      const client = clientRef.current;
      client.invalidateQueries({ queryKey: keys.notifications.all });

      // Refresh what the event actually changed, not just the bell.
      //
      // Without this the stream was cosmetic: the background poll would import
      // a supplier's reply, the toast would say so, and the Sourcing screen
      // behind it carried on showing the old thread and the old status until
      // the buyer reloaded the page. The notification is the only signal the
      // client gets that server-side state moved, so it has to be the thing
      // that invalidates.
      //
      // Invalidation, not refetch: React Query only re-runs the queries that
      // are actually mounted, so a notification arriving while the user is on
      // Products costs nothing and the Sourcing data is simply marked stale
      // for whenever they go back.
      switch (notification.kind) {
        case "supplier_replied":
          // A reply lands in the thread, moves the request's status to
          // `replied`, and changes where it sits on the pipeline board.
          client.invalidateQueries({ queryKey: keys.sourcing.all });
          client.invalidateQueries({ queryKey: keys.mailbox.all });
          break;
        case "inbox_mail":
          // Inbox rows are read live from Gmail, so only the mailbox queries
          // are stale — nothing in sourcing has moved.
          client.invalidateQueries({ queryKey: keys.mailbox.all });
          break;
        case "follow_up_due":
        case "status_changed":
          client.invalidateQueries({ queryKey: keys.sourcing.all });
          break;
        default:
          // An unknown kind from a newer server: refresh nothing rather than
          // guess. The bell above still updates.
          break;
      }

      // The bell alone is easy to miss while reading something else; a supplier
      // replying is worth interrupting for. Clicking through is deliberately
      // not wired here — the tray is one click away and already knows how to
      // route an entity.
      toast.success(notification.title, {
        id: `notification-${notification.id}`,
        duration: 6000,
      });
      // After the toast: the chime is the least important part of this and
      // must never be what stops the rest from happening.
      playNotificationSound();
    };

    const connect = async () => {
      if (stopped) return;

      try {
        const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
          headers: {
            Accept: "text/event-stream",
            ...(getAccessToken()
              ? { Authorization: `Bearer ${getAccessToken()}` }
              : {}),
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 401) {
          // Expected on any stream older than the access token. Renew once and
          // reconnect immediately; if the session is genuinely gone, stop —
          // RequireAuth will be redirecting anyway.
          const renewed = await refreshSession();
          if (!renewed) {
            stopped = true;
            return;
          }
          attempt = 0;
          void connect();
          return;
        }

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        // Connected. Reset the backoff so a long healthy session does not
        // inherit the delay from whatever failure preceded it.
        attempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by a blank line. A frame can arrive split
          // across reads, so anything after the last separator stays buffered.
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            // Lines starting with ":" are comments — the server's keepalive.
            const dataLines = frame
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());
            if (dataLines.length === 0) continue;

            try {
              onNotification(JSON.parse(dataLines.join("\n")));
            } catch {
              // A malformed frame is not worth killing the stream over.
            }
          }
        }

        // The server closed cleanly (a restart, or a proxy timeout). Reconnect.
        throw new Error("Stream ended");
      } catch (error) {
        if (stopped || controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;

        attempt += 1;
        // 1s, 2s, 4s … capped at 30s.
        const delay = Math.min(1000 * 2 ** (attempt - 1), 30_000);
        retryTimer = setTimeout(() => void connect(), delay);
      }
    };

    void connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      controller.abort();
    };
  }, [enabled]);
}
