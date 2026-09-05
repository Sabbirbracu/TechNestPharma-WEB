"use client";

import { useSyncExternalStore } from "react";
import { Hourglass } from "lucide-react";
import {
  getRateLimit,
  getRateLimitServer,
  subscribeRateLimit,
} from "@/lib/rate-limit";

/**
 * What the API is doing when it answers 429, said out loud.
 *
 * Before this, a throttled screen span indefinitely. The server log filled with
 * "429 Too Many Requests" while the browser showed a loading state with no end
 * and no explanation — which reads as a broken app rather than as a limit that
 * clears on its own inside a minute.
 *
 * A banner rather than a toast, for two reasons: it has to persist for the
 * whole wait, which a self-dismissing toast cannot do, and it has to hold a
 * ticking number, so the user can see something counting down rather than
 * wonder whether it has hung. It removes itself when the window clears, at
 * which point the queries retry on their own.
 *
 * One banner for the whole app, not one per query. The dashboard fires half a
 * dozen requests at once and they trip the limit together; six copies of the
 * same sentence would be worse than none.
 *
 * No effects and no local state: the countdown is ticked by the store (see
 * `remaining` there), so this is a pure render of one snapshot.
 */
export function RateLimitBanner() {
  const state = useSyncExternalStore(
    subscribeRateLimit,
    getRateLimit,
    getRateLimitServer,
  );

  if (!state) return null;

  return (
    <div
      // `status`, not `alert`: a condition that resolves itself should be
      // announced without interrupting what a screen reader is already saying.
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-100 flex justify-center px-3"
    >
      <div className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 shadow-lg backdrop-blur-sm">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
          <Hourglass className="size-3.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">Too many requests</p>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-muted-foreground">
            {state.message}
          </p>
          <p className="mt-1 text-xs font-bold tabular-nums text-warning-foreground">
            {state.remaining > 0
              ? `Retrying in ${state.remaining}s…`
              : "Retrying now…"}
          </p>
        </div>
      </div>
    </div>
  );
}
